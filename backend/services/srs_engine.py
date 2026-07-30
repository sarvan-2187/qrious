def calculate_sm2(rating: int, ease_factor: float = 2.5, interval: int = 1, repetitions: int = 0):
    """
    SuperMemo-2 (SM-2) Spaced Repetition Algorithm.
    rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
    """
    # Map rating (1..4) to SM-2 q (0..5)
    # 1 -> 0 (Complete failure)
    # 2 -> 3 (Hard)
    # 3 -> 4 (Good)
    # 4 -> 5 (Perfect)
    q_map = {1: 0, 2: 3, 3: 4, 4: 5}
    q = q_map.get(rating, 3)

    if q < 3:
        # Failed recall: reset repetitions and interval to 1 day
        repetitions = 0
        interval = 1
    else:
        # Successful recall: advance interval based on repetition count
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = int(round(interval * ease_factor))
        repetitions += 1

    # Update ease factor EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if ease_factor < 1.3:
        ease_factor = 1.3

    return round(ease_factor, 2), interval, repetitions
