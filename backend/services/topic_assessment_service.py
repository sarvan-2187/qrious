from typing import Literal, List, Dict, Any
from uuid import uuid4
import logging

from ai.gateway import AIGateway, AITask
from ai.models import ChatMessage
from models.quiz_generation import TopicQuizGenerationResult

logger = logging.getLogger(__name__)

async def generate_topic_assessment_questions(
    topic: dict, 
    test_type: Literal["pre", "post"], 
    uid: str,
    gateway: AIGateway
) -> List[Dict[str, Any]]:
    """
    Generate topic-scoped pre/post assessment questions using AI.
    Pre-test = max 10 EASY questions.
    Post-test = max 10 MEDIUM/HARD questions.
    """
    
    topic_title = topic.get("title", "Quantum Concepts")
    topic_desc = topic.get("description", "")
    
    if test_type == "pre":
        prompt_instruction = (
            f"Write up to 10 EASY multiple-choice questions testing foundational recall of "
            f"'{topic_title}'. Context: {topic_desc}. "
            f"Every question's difficulty MUST be strictly 'easy'. "
            f"Focus on basic definitions and core facts."
        )
    else:
        prompt_instruction = (
            f"Write up to 10 MEDIUM/HARD multiple-choice questions testing applied understanding of "
            f"'{topic_title}'. Context: {topic_desc}. "
            f"Roughly half should be 'medium' and half 'hard', NONE 'easy'. "
            f"Focus on deeper conceptual understanding, problem solving, and nuances."
        )
        
    system_prompt = (
        f"{prompt_instruction} "
        f"You must provide exactly 4 options per question, one correct_option_id matching an option's id, "
        f"a one-sentence explanation, and a short 'concept' label (1-3 words) per question."
    )
    
    messages = [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=f"Generate the {test_type}-test for {topic_title}.")
    ]
    
    # Generate via AI Gateway
    try:
        response: TopicQuizGenerationResult = await gateway.chat(
            messages=messages,
            task=AITask.QUIZ,
            response_model=TopicQuizGenerationResult,
            identity=uid,
            preferred_provider="groq"  # Fast generation
        )
    except Exception as e:
        logger.error(f"Failed to generate {test_type} questions for {topic_title}: {str(e)}")
        raise
        
    # gateway.chat() returns AIResponse; the structured output is in .parsed
    if not response.parsed:
        logger.error(f"AI Gateway returned no parsed structured output for {topic_title} {test_type}-test")
        raise ValueError(f"Failed to parse AI response into TopicQuizGenerationResult")

    parsed_result: TopicQuizGenerationResult = response.parsed  # type: ignore
    generated_qs = parsed_result.questions
    
    # Guard: Coerce difficulty if the AI ignored the instruction, instead of dropping questions
    filtered_qs = []
    for q in generated_qs:
        if test_type == "pre" and q.difficulty != "easy":
            q.difficulty = "easy"
        if test_type == "post" and q.difficulty == "easy":
            q.difficulty = "medium"
        filtered_qs.append(q)
        
    # Enforce max 10
    filtered_qs = filtered_qs[:10]
    
    # Map to expected quiz dictionary shape
    mapped_questions = []
    for q in filtered_qs:
        
        # XP mapping based on difficulty
        xp_reward = 10
        if q.difficulty == "medium":
            xp_reward = 15
        elif q.difficulty == "hard":
            xp_reward = 20
            
        mapped_questions.append({
            "_id": str(uuid4()),
            "type": "mcq",
            "topic_slug": topic.get("slug"),
            "concept": q.concept,
            "difficulty": q.difficulty,
            "prompt": q.prompt,
            "options": [{"id": opt.id, "text": opt.text} for opt in q.options],
            "correct_answer": q.correct_option_id,
            "explanation": q.explanation,
            "xp_reward": xp_reward,
            "time_limit_seconds": 60
        })
        
    return mapped_questions
