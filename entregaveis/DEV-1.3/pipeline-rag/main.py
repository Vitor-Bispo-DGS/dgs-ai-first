import chromadb
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter
import re


# Headers que viram fronteiras de chunk + metadados de hierarquia
_MARKDOWN_HEADERS = [
    ("#", "h1"),
    ("##", "h2"),
    ("###", "h3"),
    ("####", "h4"),
]


def _split_documents(documents):
    """Divide os documentos por headers markdown e depois por tamanho máximo."""
    header_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=_MARKDOWN_HEADERS,
        strip_headers=False,  # mantém o header no texto do chunk para contexto
    )
    size_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
    )

    all_chunks = []
    for doc in documents:
        # 1ª passagem: divide por headers (preserva estrutura de seções)
        header_chunks = header_splitter.split_text(doc.page_content)

        # Propaga metadados do documento-pai (ex: source) para cada chunk
        for chunk in header_chunks:
            chunk.metadata.update(doc.metadata)

        # 2ª passagem: subdividide seções muito longas mantendo overlap
        split_chunks = size_splitter.split_documents(header_chunks)
        for source_chunk_index, chunk in enumerate(split_chunks):
            chunk.metadata["source_chunk_index"] = source_chunk_index
        all_chunks.extend(split_chunks)

    for chunk_index, chunk in enumerate(all_chunks):
        chunk.metadata["chunk_index"] = chunk_index

    return all_chunks


def _section_candidates(text: str) -> set[str]:
    return {
        match.strip().rstrip(".")
        for match in re.findall(r"seç(?:ão|oes)\s+((?:\d+)(?:\.\d+)*)", text, flags=re.IGNORECASE)
    }


def _matches_section(metadata: dict, sections: set[str]) -> bool:
    if not sections:
        return False

    for key in ("h2", "h3", "h4"):
        header = metadata.get(key, "")
        for section in sections:
            if header.startswith(section):
                return True
    return False


def _fetch_related_chunks(collection, seed_chunk: dict, limit: int = 2) -> list[dict]:
    source = seed_chunk["metadata"].get("source")
    if not source:
        return []

    siblings = collection.get(
        where={"source": source},
        include=["documents", "metadatas"],
    )

    seed_index = seed_chunk["metadata"].get("source_chunk_index")
    seed_h2 = seed_chunk["metadata"].get("h2")
    section_refs = _section_candidates(seed_chunk["text"])

    scored_candidates = []
    for doc, metadata in zip(siblings["documents"], siblings["metadatas"]):
        candidate_index = metadata.get("source_chunk_index")
        if candidate_index == seed_index:
            continue

        same_parent_section = bool(seed_h2 and metadata.get("h2") == seed_h2)
        referenced_section = _matches_section(metadata, section_refs)
        adjacent_chunk = (
            seed_index is not None
            and candidate_index is not None
            and abs(candidate_index - seed_index) <= 1
        )

        if not (same_parent_section or referenced_section):
            continue

        score = (
            3 if referenced_section else 0,
            2 if same_parent_section else 0,
            1 if adjacent_chunk else 0,
            -(abs(candidate_index - seed_index) if seed_index is not None and candidate_index is not None else 99),
        )
        scored_candidates.append(
            {
                "text": doc,
                "metadata": metadata,
                "distance": seed_chunk["distance"],
                "retrieval_reason": "related",
                "score": score,
            }
        )

    scored_candidates.sort(key=lambda item: item["score"], reverse=True)
    return scored_candidates[:limit]


def index_documents(client: chromadb.ClientAPI, embeddings: HuggingFaceEmbeddings):
    """Carrega, chunka e armazena os documentos markdown no ChromaDB."""
    loader = DirectoryLoader(
        './documents/markdown/',
        glob='**/*.md',
        show_progress=True,
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
    )
    documents = loader.load()
    print(f"\n[Indexação] {len(documents)} documento(s) carregado(s).")

    chunks = _split_documents(documents)
    print(f"[Indexação] {len(chunks)} chunk(s) gerado(s).")

    # Enriquece o texto com prefixo de contexto antes de embedar.
    # O prefixo inclui o nome do arquivo e os cabeçalhos da hierarquia markdown,
    # aumentando a proximidade semântica entre query e chunk.
    def _build_context_prefix(meta: dict) -> str:
        source = meta.get("source", "").replace("\\", "/").split("/")[-1]
        headers = " > ".join(
            meta[k] for k in ("h1", "h2", "h3", "h4") if meta.get(k)
        )
        parts = [p for p in (source, headers) if p]
        return ("[" + " | ".join(parts) + "] ") if parts else ""

    enriched_texts = [
        _build_context_prefix(chunk.metadata) + chunk.page_content
        for chunk in chunks
    ]

    texts = [chunk.page_content for chunk in chunks]
    metadatas = [chunk.metadata for chunk in chunks]
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    vectors = embeddings.embed_documents(enriched_texts)

    # Recria a coleção para garantir estado limpo a cada indexação
    try:
        client.delete_collection(name="novatech_docs")
    except Exception:
        pass
    collection = client.create_collection(name="novatech_docs")

    collection.add(
        ids=ids,
        documents=texts,
        embeddings=vectors,
        metadatas=metadatas,
    )
    print(f"[Indexação] {len(chunks)} chunk(s) armazenado(s) no ChromaDB.\n")
    return collection


def query(
    collection,
    embeddings: HuggingFaceEmbeddings,
    prompt: str,
    n_results: int = 5,
    related_per_chunk: int = 2,
) -> list[dict]:
    """Busca os chunks mais relevantes para o prompt informado.

    Retorna uma lista de dicts com as chaves:
        - text (str): conteúdo do chunk
        - metadata (dict): metadados do documento de origem
        - distance (float): distância coseno em relação ao prompt
    """
    query_vector = embeddings.embed_query(prompt)
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=n_results,
    )

    chunks = [
        {"text": doc, "metadata": meta, "distance": dist}
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        )
    ]

    selected_ids = {
        chunk["metadata"].get("chunk_index")
        for chunk in chunks
        if chunk["metadata"].get("chunk_index") is not None
    }

    expanded_chunks = list(chunks)
    for chunk in chunks:
        for related_chunk in _fetch_related_chunks(collection, chunk, limit=related_per_chunk):
            related_id = related_chunk["metadata"].get("chunk_index")
            if related_id in selected_ids:
                continue
            selected_ids.add(related_id)
            expanded_chunks.append(related_chunk)

    return expanded_chunks

def gerar_prompt(collection, embeddings: HuggingFaceEmbeddings, prompt: str) -> str:
    system_prompt = ""
    with open("./system_prompt.md", "r", encoding="utf-8") as file:
        system_prompt = file.read()
    
    chunks = query(collection, embeddings, prompt)
    if not chunks:
        raise ValueError("Nenhum chunk encontrado para o prompt fornecido.")
    
    final_prompt = system_prompt + "\n\n Considere os seguintes trechos de documentos indexados:\n\n"
    for i, chunk in enumerate(chunks):
        final_prompt += f"=== Chunk {i + 1} ===\n"
        final_prompt += f"Fonte: {chunk['metadata'].get('source', 'N/A')}\n"
        final_prompt += f"Distância: {chunk['distance']:.4f}\n"
        if chunk.get("retrieval_reason") == "related":
            final_prompt += "Observação: chunk complementar recuperado na segunda passada.\n"
        final_prompt += f"{chunk['text']}\n\n"

    final_prompt += "Use essas informações para responder à pergunta a seguir. Priorize chunks com menor distância.\n"
    final_prompt += f"\n\nCom base nos documentos indexados, responda à seguinte pergunta:\n\n{prompt}"
    return final_prompt

def exportar_prompt_para_arquivo(prompt: str, filename: str = "final_prompt.md"):
    with open(filename, "w", encoding="utf-8") as file:
        file.write(prompt)

def main():
    # paraphrase-multilingual-MiniLM-L12-v2 suporta 50+ idiomas (incluindo PT-BR)
    # e produz embeddings semanticamente equivalentes entre idiomas.
    embeddings = HuggingFaceEmbeddings(model_name='paraphrase-multilingual-MiniLM-L12-v2')

    client = chromadb.PersistentClient(path="./chroma_db")

    # Re-indexa sempre que o script é executado.
    # Para ambientes de produção, adicione uma verificação de "já indexado".
    collection = index_documents(client, embeddings)

    while True:
        prompt = input("\nDigite sua pergunta (ou 'sair' para encerrar): ").strip()
        if prompt.lower() in ("sair", "exit", "quit"):
            break
        if prompt:
            prompt_completo = gerar_prompt(collection, embeddings, prompt)
            exportar_prompt_para_arquivo(prompt_completo)
            print("\n=== Prompt Gerado para o LLM ===")


if __name__ == "__main__":
    main()
