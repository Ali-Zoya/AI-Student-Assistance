import re
import json
import requests
from ..config import Config

def extract_definition_cards(topic: str, text: str, max_count: int = 5) -> list:
    """
    Intelligent heuristic sentence analyzer that extracts core definitions,
    processes, and explanations to synthesize flashcards without relying on external APIs.
    """
    cleaned_text = re.sub(r"\s+", " ", text).strip()
    raw_sentences = re.split(r"(?<=[.?!])\s+", cleaned_text)
    sentences = [s.strip() for s in raw_sentences if len(s.strip()) > 15]

    cards = []
    
    # Common academic explanatory patterns
    patterns = [
        # X is the process of / by which Y
        (r"^(.*?)\s+(is the process (?:by which|of|where))\s+(.*)$",
         "What is {term}?", "{term} {verb} {definition}."),
        # X is defined as / refers to / means Y
        (r"^(.*?)\s+(is defined as|is described as|refers to|means)\s+(.*)$",
         "What is {term}?", "{term} {verb} {definition}."),
        # X is a / an Y
        (r"^(.*?)\s+(is an|is a|are)\s+(.*)$",
         "What is {term}?", "{term} {verb} {definition}."),
        # The primary function / purpose of X is Y
        (r"^(?:The purpose of|The primary function of|The main role of)\s+(.*?)\s+(is to|is)\s+(.*)$",
         "What is the purpose of {term}?", "The purpose of {term} {verb} {definition}."),
        # X stands for Y
        (r"^(.*?)\s+(stands for|represents|denotes)\s+(.*)$",
         "What does {term} stand for?", "{term} {verb} {definition}.")
    ]

    used_terms = set()

    for sentence in sentences:
        if len(cards) >= max_count:
            break

        matched = False
        for regex, q_template, a_template in patterns:
            match = re.match(regex, sentence, re.IGNORECASE)
            if match:
                term = match.group(1).strip(" .:,;\"'").capitalize()
                verb = match.group(2).strip()
                definition = match.group(3).strip(" .:,;\"'")
                
                # Check that the term is reasonable (1 to 6 words)
                term_word_count = len(term.split())
                if 1 <= term_word_count <= 6 and term.lower() not in used_terms:
                    used_terms.add(term.lower())
                    
                    q = q_template.format(term=term)
                    a = a_template.format(term=term, verb=verb, definition=definition)
                    # Normalize ending punctuation
                    a = re.sub(r"\.+$", ".", a)
                        
                    # Difficulty estimation based on sentence complexity
                    diff = "Easy" if len(a.split()) < 15 else ("Medium" if len(a.split()) < 30 else "Hard")
                    
                    cards.append({
                        "question": q,
                        "answer": a,
                        "topic": topic or "General",
                        "difficulty": diff,
                        "source": "heuristic"
                    })
                    matched = True
                    break

        if not matched and len(cards) < max_count and len(sentence.split()) >= 5:
            # Fallback: create conceptual question from informative sentence
            first_words = " ".join(sentence.split()[:4])
            diff = "Medium"
            cards.append({
                "question": f"Key concept in {topic or 'Subject'}: What is significant regarding '{first_words}...'?",
                "answer": sentence,
                "topic": topic or "General",
                "difficulty": diff,
                "source": "heuristic"
            })

    # If still no cards (e.g. very short text or single concept)
    if not cards and text:
        cards.append({
            "question": f"What is the definition of {topic or 'Key Concept'}?",
            "answer": text[:350] + ("..." if len(text) > 350 else ""),
            "topic": topic or "General",
            "difficulty": "Easy",
            "source": "heuristic"
        })

    return cards[:max_count]

def generate_flashcards_gemini(topic: str, study_text: str, count: int = 5) -> list:
    """
    Calls Google Gemini API to generate structured flashcards.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={Config.GEMINI_API_KEY}"
    
    prompt = f"""You are an expert academic tutor. Based on the following study topic and lecture material, synthesize exactly {count} high-yield study flashcards.
Each flashcard must contain:
1. question: clear, precise question testing a core concept.
2. answer: concise, accurate, and educational answer.
3. topic: the topic or subtopic name.
4. difficulty: one of ["Easy", "Medium", "Hard"].

Topic: {topic}
Study Material:
{study_text}

Respond ONLY with a valid JSON array of objects with keys "question", "answer", "topic", and "difficulty". Do not include Markdown code blocks or any explanation outside the JSON.
"""

    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1200
        }
    }

    response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=12)
    response.raise_for_status()
    result = response.json()
    
    text_content = result["candidates"][0]["content"]["parts"][0]["text"].strip()
    
    # Clean possible markdown fences
    if text_content.startswith("```"):
        text_content = re.sub(r"^```(?:json)?\n", "", text_content)
        text_content = re.sub(r"\n```$", "", text_content)
        
    cards_data = json.loads(text_content.strip())
    
    formatted_cards = []
    for item in cards_data:
        formatted_cards.append({
            "question": item.get("question", "").strip(),
            "answer": item.get("answer", "").strip(),
            "topic": item.get("topic", topic or "General").strip(),
            "difficulty": item.get("difficulty", "Medium").capitalize(),
            "source": "ai"
        })
    return formatted_cards

def generate_study_flashcards(topic: str, study_text: str, count: int = 5) -> dict:
    """
    Main generator pipeline:
    Tries Google Gemini if configured, otherwise falls back gracefully
    to the Smart Heuristic Extraction engine, with complete transparent labeling.
    """
    topic = (topic or "").strip()
    study_text = (study_text or "").strip()
    
    if not study_text:
        return {
            "success": False,
            "error": "Please provide study notes or text to generate flashcards.",
            "cards": []
        }

    # If Gemini API Key is configured, attempt external AI synthesis
    if Config.GEMINI_API_KEY:
        try:
            cards = generate_flashcards_gemini(topic, study_text, count)
            if cards:
                return {
                    "success": True,
                    "source": "ai",
                    "source_label": "AI Generated (Google Gemini)",
                    "cards": cards
                }
        except Exception:
            # External API failed or unauthorized -> seamlessly continue to heuristic
            pass

    # Transparent Heuristic Fallback
    heuristic_cards = extract_definition_cards(topic, study_text, count)
    return {
        "success": True,
        "source": "heuristic",
        "source_label": "Smart Heuristic Extraction (Local)",
        "cards": heuristic_cards
    }
