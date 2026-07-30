import math
from typing import Dict, Any, List, Union, Tuple

class QuizGradingService:
    def grade_question(self, question: Dict[str, Any], user_selected: Any) -> Tuple[bool, float, str]:
        """
        Grades a single question based on its type.
        Returns:
            (is_correct: bool, xp_earned: float, feedback_text: str)
        """
        q_type = question.get("type", "mcq")
        correct_ans = question.get("correct_answer")
        difficulty = question.get("difficulty", "easy")
        
        # Difficulty multipliers: easy = 1.0, medium = 1.5, hard = 2.0
        difficulty_mult = {
            "easy": 1.0,
            "medium": 1.5,
            "hard": 2.0
        }.get(difficulty.lower(), 1.0)
        
        base_xp = question.get("xp_reward", 10)
        max_question_xp = round(base_xp * difficulty_mult)

        if user_selected is None:
            return False, 0.0, "No answer provided."

        is_correct = False

        try:
            if q_type == "mcq" or q_type == "image_based":
                is_correct = str(user_selected).strip() == str(correct_ans).strip()

            elif q_type == "multi_correct":
                if isinstance(user_selected, list) and isinstance(correct_ans, list):
                    is_correct = set(str(s).strip() for s in user_selected) == set(str(c).strip() for c in correct_ans)

            elif q_type == "true_false":
                is_correct = str(user_selected).strip().lower() == str(correct_ans).strip().lower()

            elif q_type == "match":
                if isinstance(user_selected, dict) and isinstance(correct_ans, dict):
                    norm_user = {str(k).strip(): str(v).strip() for k, v in user_selected.items()}
                    norm_corr = {str(k).strip(): str(v).strip() for k, v in correct_ans.items()}
                    is_correct = norm_user == norm_corr

            elif q_type == "fill_blank":
                user_str = str(user_selected).strip().lower()
                if isinstance(correct_ans, list):
                    is_correct = any(user_str == str(alt).strip().lower() for alt in correct_ans)
                else:
                    is_correct = user_str == str(correct_ans).strip().lower()

            elif q_type == "arrange_steps":
                if isinstance(user_selected, list) and isinstance(correct_ans, list):
                    is_correct = [str(s).strip() for s in user_selected] == [str(c).strip() for c in correct_ans]

            elif q_type == "circuit_prediction":
                if isinstance(correct_ans, dict) and isinstance(user_selected, dict):
                    # Compare probabilities or statevector dictionary
                    is_correct = all(
                        abs(float(user_selected.get(k, 0)) - float(v)) < 0.05
                        for k, v in correct_ans.items()
                    )
                else:
                    is_correct = str(user_selected).strip() == str(correct_ans).strip()

            elif q_type == "bloch_sphere":
                if isinstance(correct_ans, dict) and isinstance(user_selected, dict):
                    # Tolerance check for theta and phi angles in radians
                    user_theta = float(user_selected.get("theta", 0))
                    user_phi = float(user_selected.get("phi", 0))
                    corr_theta = float(correct_ans.get("theta", 0))
                    corr_phi = float(correct_ans.get("phi", 0))
                    
                    theta_diff = abs(user_theta - corr_theta)
                    phi_diff = abs((user_phi - corr_phi) % (2 * math.pi))
                    is_correct = theta_diff < 0.2 and (phi_diff < 0.2 or abs(phi_diff - 2*math.pi) < 0.2)
                else:
                    is_correct = str(user_selected).strip() == str(correct_ans).strip()

            else:
                # Fallback to string comparison
                is_correct = str(user_selected).strip().lower() == str(correct_ans).strip().lower()

        except Exception as e:
            print(f"Error grading question {question.get('_id')}: {e}")
            is_correct = False

        xp_earned = max_question_xp if is_correct else 0.0
        
        # Format feedback
        wrong_fb = question.get("wrong_answer_feedback", {})
        if not is_correct and isinstance(user_selected, str) and user_selected in wrong_fb:
            feedback_text = wrong_fb[user_selected]
        else:
            feedback_text = question.get("explanation", "")

        return is_correct, xp_earned, feedback_text

quiz_grading_service = QuizGradingService()
