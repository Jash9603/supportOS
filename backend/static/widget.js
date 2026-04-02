/**
 * SupportOS — Embeddable Chat Widget Loader
 *
 * Usage:
 *   <script
 *     src="http://localhost:8000/static/widget.js"
 *     data-org-id="YOUR_ORG_UUID"
 *     data-frontend-url="http://localhost:5173">
 *   </script>
 *
 * This tiny loader creates:
 *   1. A floating chat bubble button (bottom-right)
 *   2. An iframe pointing at /widget/{orgId} on the frontend
 *
 * No dependencies. No build step. Works on any website.
 * 
 * 
What does "static" mean?
In web development, there are two kinds of files your server can give out:

Dynamic → The server runs code to generate a response. Like when you hit /auth/login, Python runs your FastAPI function, queries the database, and builds a JSON response on the fly.
Static → The server just hands over a file as-is. No processing. Like serving an image, a CSS file, or a JavaScript file. It's like a file download.
widget.js never changes based on who's requesting it. It's the same file for every customer. So there's no reason for Python to "process" it — just hand the file over. That's what StaticFiles does.

 */


/*
IN LAYMAN TERMS 

Imagine you run a pizza shop (SupportOS).
A restaurant (your customer's website) wants to offer your pizza to their diners.

Step 1: You give the restaurant a MENU CARD (widget.js)
        → This is the static file. Same card for every restaurant.
        → They just tape it to their wall (<script> tag)

Step 2: A diner reads the menu card and it says:
        "Call this number to order" (creates an iframe → /widget/{orgId})

Step 3: The diner calls the number (iframe loads your React chat UI)

Step 4: The diner places an order (sends a message over WebSocket)

Step 5: Your kitchen gets the order (Ticket created in Postgres)



*/
(function () {
  var script = document.currentScript;
  var orgId = script.getAttribute("data-org-id");
  var frontendUrl =
    script.getAttribute("data-frontend-url") || "http://localhost:5173";

  if (!orgId) {
    console.error("[SupportOS] Missing data-org-id attribute on script tag.");
    return;
  }

  // ── Iframe (chat window) ────────────────────────────────
  var iframe = document.createElement("iframe");
  iframe.src = frontendUrl + "/widget/" + orgId;
  iframe.style.cssText =
    "position:fixed;" +
    "bottom:88px;" +
    "right:20px;" +
    "width:370px;" +
    "height:540px;" +
    "border:none;" +
    "border-radius:14px;" +
    "box-shadow:0 10px 40px rgba(0,0,0,0.18);" +
    "z-index:2147483647;" +
    "display:none;" +
    "transition:opacity 0.2s ease,transform 0.2s ease;" +
    "opacity:0;" +
    "transform:translateY(10px);";
  document.body.appendChild(iframe);

  // ── Toggle button (floating bubble) ─────────────────────
  var btn = document.createElement("button");
  btn.innerHTML = "💬";
  btn.style.cssText =
    "position:fixed;" +
    "bottom:20px;" +
    "right:20px;" +
    "width:56px;" +
    "height:56px;" +
    "border-radius:50%;" +
    "border:none;" +
    "background:#0F172A;" +
    "color:#fff;" +
    "font-size:24px;" +
    "cursor:pointer;" +
    "box-shadow:0 4px 16px rgba(0,0,0,0.2);" +
    "z-index:2147483647;" +
    "transition:transform 0.2s ease;";
  btn.onmouseenter = function () {
    btn.style.transform = "scale(1.1)";
  };
  btn.onmouseleave = function () {
    btn.style.transform = "scale(1)";
  };
  document.body.appendChild(btn);

  var open = false;
  btn.onclick = function () {
    open = !open;
    if (open) {
      iframe.style.display = "block";
      // Trigger animation on next frame
      requestAnimationFrame(function () {
        iframe.style.opacity = "1";
        iframe.style.transform = "translateY(0)";
      });
      btn.innerHTML = "✕";
    } else {
      iframe.style.opacity = "0";
      iframe.style.transform = "translateY(10px)";
      setTimeout(function () {
        iframe.style.display = "none";
      }, 200);
      btn.innerHTML = "💬";
    }
  };
})();
