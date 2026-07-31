from typing import List, Literal
from pydantic import BaseModel, Field

class GeneratedQuizOption(BaseModel):
    id: str
    text: str

class GeneratedQuizQuestion(BaseModel):
    concept: str
    difficulty: Literal["easy", "medium", "hard"]
    prompt: str
    options: List[GeneratedQuizOption] = Field(min_length=4, max_length=4)
    correct_option_id: str
    explanation: str

class TopicQuizGenerationResult(BaseModel):
    questions: List[GeneratedQuizQuestion] = Field(min_length=1, max_length=10)
