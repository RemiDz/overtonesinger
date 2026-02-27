Check how routing works in this project. The /about and /guide routes return 404 on GitHub Pages when accessed directly. This is the classic SPA routing problem — GitHub Pages doesn't know to serve index.html for all routes.

Fix this by copying index.html to 404.html in the build output, so GitHub Pages serves the app shell for any route. Check if there's already a 404.html in client/public/ — if not, create one that redirects to the SPA. Also check the vite build config and the GitHub Actions deploy workflow to make sure 404.html ends up in the deployed output.

Common solutions:



Add a 404.html to client/public/ that contains the same content as index.html (or a redirect script)

Or add a post-build step in the GitHub Actions workflow: cp dist/index.html dist/404.html



Verify the fix works for both /about and /guide routes.

