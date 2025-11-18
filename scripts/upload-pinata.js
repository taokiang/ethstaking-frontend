import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

const PINATA_JWT = process.env.PINATA_JWT;

async function uploadDist() {
  const distPath = path.join(process.cwd(), "dist");

  const form = new FormData();

  // 递归添加 dist 目录的所有文件
  function addFiles(dir, base = "") {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      const relPath = path.join(base, file);

      if (stat.isDirectory()) {
        addFiles(full, relPath);
      } else {
        form.append("file", fs.createReadStream(full), {
          filepath: relPath // 必须使用 filepath，而不是 filename
        });
      }
    }
  }

  addFiles(distPath);

  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: "vite-dist"
    })
  );

  form.append(
    "pinataOptions",
    JSON.stringify({
      cidVersion: 1
    })
  );

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${PINATA_JWT}`
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    }
  );

  console.log("上传成功：", res.data);
}

uploadDist();
