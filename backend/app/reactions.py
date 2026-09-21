from .models import Expression


REACTIONS: dict[Expression, str] = {
    "happy": "You seem upbeat. Want to keep that momentum going?",
    "sad": "You look a little low. A short pause or a kind check-in may help.",
    "angry": "There may be some tension. Let’s slow down for one breath.",
    "surprised": "That looks unexpected. Take a moment to process it.",
    "fearful": "You may seem uneasy. You’re in control—pause whenever you need to.",
    "disgusted": "That reaction says ‘not for me.’ Want to move on?",
    "confused": "You may be puzzling something out. Would a simpler explanation help?",
    "neutral": "I’m here and paying attention. How would you like to continue?",
}


def reaction_for(expression: Expression) -> str:
    # This layer is deliberately deterministic. It can be replaced by an LLM later,
    # while retaining the observed expression and confidence as grounding context.
    return REACTIONS[expression]
