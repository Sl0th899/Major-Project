# TEST-ONLY OpenAI-compatible stub so the real backend path can be exercised without an API key.
import json, time, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        last = body["messages"][-1]["content"]
        time.sleep(1.2)
        reply = f"That sounds like a lot to carry. You said: \"{last[:60]}\".\n\nA few gentle things we could try:\n- Take one slow breath\n- Name **one** small thing that went okay\n\nWhat feels hardest right now?"
        out = json.dumps({"choices": [{"message": {"role": "assistant", "content": reply}}]}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(out)
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
