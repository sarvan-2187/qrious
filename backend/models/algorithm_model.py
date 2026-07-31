from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class Complexity(BaseModel):
    classical: str
    quantum: str
    notes: str = ""

class QuickInfo(BaseModel):
    difficulty: str = ""
    category: str = ""
    quantumAdvantage: str = ""
    mainConcepts: List[str] = []
    prerequisites: List[str] = []
    circuitType: str = ""
    hardwareSuitability: str = ""
    outputType: str = ""
    relatedAlgorithms: List[str] = []

class AlgorithmContent(BaseModel):
    overview: str = ""
    whyNeeded: str = ""
    classicalIntuition: str = ""
    quantumIdea: str = ""
    conceptsUsed: str = ""
    inputsOutputs: str = ""
    stepByStep: str = ""
    circuitExplanation: str = ""
    mathematicalExplanation: str = ""
    workedExample: str = ""
    measurement: str = ""
    complexity: str = ""
    speedupSource: str = ""
    realWorldAnalogy: str = ""
    applications: str = ""
    advantages: str = ""
    limitations: str = ""
    hardwareRequirements: str = ""
    relatedAlgorithmsDetail: str = ""
    tryItYourself: str = ""

class AlgorithmBase(BaseModel):
    id: str
    name: str
    slug: str
    shortDescription: str
    level: int = 1
    status: str = "active"
    quickInfo: QuickInfo
    content: AlgorithmContent
    example_circuit: Optional[Dict[str, Any]] = None

class AlgorithmSummary(BaseModel):
    slug: str
    name: str
    shortDescription: str
    difficulty: str
    category: str
    learningLevel: int
    status: str = "active"
    relatedAlgorithms: List[str] = []
