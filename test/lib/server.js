"use strict";

const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");
// const port = 8080;

const requestHandler = function(request, response) {
  const uri = url.parse(request.url).pathname;
  const filename = path.join(process.cwd(), uri);
  const contentTypesByExtension = {
          ".html": "text/html",
          ".css":  "text/css",
          ".js":   "text/javascript",
          ".png":  "image/png"
        };
  const contentType = contentTypesByExtension[path.extname(filename)] || "text/plain";

  fs.exists(filename, function(exists) {
    if (!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n" + filename);
      response.end();
      return;
    }

    if (fs.statSync(filename).isDirectory()) {
      filename += "/index.html";
    }

    fs.readFile(filename, "binary", function(err, file) {
      if (err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      response.writeHead(200, {"Content-Type": contentType});
      response.write(file, "binary");
      response.end();
    });
  });
};

const server = http.createServer(requestHandler);

// server.listen(port, function(err) {
//   if (err) {
//     return console.log("HTTP server: something bad happened.", err)
//   }
//   console.log(`HTTPS server is listening on ${port}`)
// });

module.exports = server;
