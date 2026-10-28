import { createServer } from "http";
import { readFile } from "fs/promises";
import { create } from "domain";
import path from "path";
import { writeFile } from "fs/promises";
import crypto from "crypto";
import { url } from "inspector";
import { json } from "stream/consumers";
import { link } from "fs";
import { log } from "console";

const PORT = 3001;
const DATA_FILE = path.join("data", "links.json");

const serverFile = async (res, filepath, contenttype) => {
  try {
    const data = await readFile(filepath);
    res.writeHead(200, { "Content-Type": contenttype });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 page not found");
  }
};

const loadlinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const savelinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  if (req.method == "GET") {
    if (req.url == "/") {
      return serverFile(res, path.join("public", "index.html"), "text/html");
    } else if (req.url == "/style.css") {
      return serverFile(res, path.join("public", "style.css"), "text/css");
    } else if (req.url == "/links") {
      const links = await loadlinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(links));
    } else {
      const links = await loadlinks();
      const shortCode = req.url.slice(1);
      console.log("link red", req.url);
      if (links[shortCode]) {
        res.writeHead(302, { location: links[shortCode] });
        return res.end();
      } else {
        res.writeHead(404, {
          "Content-Type": "text/plain",
        });
        return res.end("shortend url is not found");
      }
    }
  }

  if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadlinks();

    let body = "";
    req.on("data", (chunck) => {
      body = body + chunck;
    });

    req.on("end", async () => {
      console.log(body);
      const { url, shortcode } = JSON.parse(body);
      if (!url) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("URL is required");
      }

      const finalshortcode = shortcode || crypto.randomBytes(4).toString("hex");

      if (links[finalshortcode]) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("short code already exsists . please choose another");
      }
      links[finalshortcode] = url;

      await savelinks(links);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, shortCode: finalshortcode }));
    });
  }
});

server.listen(PORT, () => {
  console.log(`server runing at http://localhost:${PORT}`);
});
