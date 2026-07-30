import os

try:
    from langchain_chroma import Chroma
except ModuleNotFoundError:
    from langchain_community.vectorstores import Chroma

class ChromaService:
    def __init__(self):
        self.persist_directory = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
        os.makedirs(self.persist_directory, exist_ok=True)
        self._embeddings = None
        self._vectorstore = None

    @property
    def embeddings(self):
        if self._embeddings is None:
            import os
            os.environ["HF_HUB_OFFLINE"] = "1"
            try:
                from langchain_huggingface import HuggingFaceEmbeddings
            except ModuleNotFoundError:
                from langchain_community.embeddings import HuggingFaceEmbeddings

            self._embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        return self._embeddings

    @property
    def vectorstore(self):
        if self._vectorstore is None:
            self._vectorstore = Chroma(
                collection_name="quantum_docs",
                embedding_function=self.embeddings,
                persist_directory=self.persist_directory
            )
        return self._vectorstore

    def get_retriever(self):
        if self.vectorstore._collection.count() == 0:
            print("Seeding ChromaDB with initial quantum docs...")
            docs = [
                "The Hadamard gate (H) creates a superposition. When applied to |0>, it creates (|0> + |1>)/sqrt(2).",
                "The Pauli-X gate acts as a quantum NOT gate, flipping |0> to |1> and vice versa.",
                "The Pauli-Y gate is a rotation around the Y-axis of the Bloch sphere.",
                "The Pauli-Z gate applies a phase flip. It leaves |0> unchanged but maps |1> to -|1>.",
                "The CNOT (CX) gate flips the target qubit if and only if the control qubit is |1>.",
                "The CZ gate applies a Z gate to the target if the control is |1>.",
                "Grover's algorithm uses an Oracle and a Diffusion operator to amplify the probability of a marked state.",
                "A measurement collapses the quantum state into one of the basis states. It is an irreversible operation.",
                "Quantum state vectors must always have a norm of 1. The sum of the squared magnitudes of the amplitudes equals 1."
            ]
            self.vectorstore.add_texts(docs)
            
        return self.vectorstore.as_retriever(search_kwargs={"k": 3})

chroma_service = ChromaService()
