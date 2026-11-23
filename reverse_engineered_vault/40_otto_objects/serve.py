import http.server
import socketserver
import webbrowser
import os

PORT = 5050
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

print(f"=======================================================")
print(f" OTTO Objects Local Replica Running!")
print(f" URL: http://localhost:{PORT}")
print(f"=======================================================")

webbrowser.open(f"http://localhost:{PORT}")

with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
