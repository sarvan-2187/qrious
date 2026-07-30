from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from auth import get_current_user
from services.langchain_service import langchain_service
from services.domain_guard_service import domain_guard_service

router = APIRouter(prefix="/api/v1/ai", tags=["AI Tutor"])

class CircuitContext(BaseModel):
    qasm: Optional[str] = None
    qubits: Optional[int] = None
    cbits: Optional[int] = None
    gateCount: Optional[int] = None
    selectedGate: Optional[str] = None
    executionResult: Optional[Dict[str, Any]] = None
    executionError: Optional[str] = None
    loadedAlgorithm: Optional[str] = None

class AiAskRequest(BaseModel):
    question: str
    circuit_context: Optional[CircuitContext] = None

class AiAskResponse(BaseModel):
    answer: str
    sources: List[str]

class ActionRequest(BaseModel):
    circuit_context: Optional[CircuitContext] = None

@router.post("/ask", response_model=AiAskResponse)
async def ask_ai(req: AiAskRequest, current_user: dict = Depends(get_current_user)):
    try:
        context_dict = req.circuit_context.dict() if req.circuit_context else None
        
        # Layer 2: Semantic Domain Classifier
        classification = await domain_guard_service.classify(
            question=req.question,
            circuit_context=context_dict,
            user_id=current_user.get("firebase_uid")
        )
        
        if classification.decision == "reject":
            # Return fixed domain rejection response without invoking the expensive RAG chain
            return AiAskResponse(
                answer="I'm focused on quantum computing and the circuit you're building in Qrious. Ask me about quantum gates, circuits, algorithms, QASM, execution results, or quantum concepts.",
                sources=[]
            )
        elif classification.decision == "ambiguous":
            return AiAskResponse(
                answer="I'm not completely sure I understand. If this is about your quantum circuit, could you clarify?",
                sources=[]
            )
            
        # Proceed with main generation if 'allow'
        res = await langchain_service.ask_question(req.question, context_dict, current_user.get("firebase_uid"))
        return AiAskResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/explain-circuit")
async def explain_circuit(req: ActionRequest, current_user: dict = Depends(get_current_user)):
    try:
        context_dict = req.circuit_context.dict() if req.circuit_context else None
        question = "Can you explain what this quantum circuit does step by step?"
        res = await langchain_service.ask_question(question, context_dict, current_user.get("firebase_uid"))
        return {"explanation": res["answer"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize")
async def optimize_circuit(req: ActionRequest, current_user: dict = Depends(get_current_user)):
    try:
        context_dict = req.circuit_context.dict() if req.circuit_context else None
        question = "Can you suggest any optimizations for this quantum circuit to reduce depth or gate count? Output any QASM modifications in markdown code blocks."
        res = await langchain_service.ask_question(question, context_dict, current_user.get("firebase_uid"))
        return {"suggestions": [res["answer"]]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-mistakes")
async def detect_mistakes(req: ActionRequest, current_user: dict = Depends(get_current_user)):
    try:
        context_dict = req.circuit_context.dict() if req.circuit_context else None
        question = "Are there any obvious mistakes or anti-patterns in this quantum circuit? Do not invent errors if the circuit seems fine."
        res = await langchain_service.ask_question(question, context_dict, current_user.get("firebase_uid"))
        return {"issues": [res["answer"]]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
