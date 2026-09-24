from groq import Groq

client = Groq(api_key="REDACTED")

history = ""
# function

def llm(query):
  global history
  answer = ""
  history=history +" " + query
  completion = client.chat.completions.create(
      model="openai/gpt-oss-120b",
      messages=[
        {
          "role": "user",
          "content": history
        }
      ],
      temperature=1,
      max_completion_tokens=2048,
      top_p=1,
      reasoning_effort="medium",
      stream=True,
      stop=None
  )
  
  for chunk in completion:
      # print(chunk.choices[0].delta.content or "", end="")
      answer += chunk.choices[0].delta.content or ""
  return answer

if __name__ == "__main__":
  while True:
    query = input("Enter your query: ")
    answer = llm(query)
    print("\nAnswer:", answer)