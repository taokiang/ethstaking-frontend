#!/usr/bin/env node
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";

/**
 * Pinata JWT 必须通过环境变量传入
 * export PINATA_JWT="your_jwt_here"
 */
const PINATA_JWT = process.env.PINATA_JWT;

if (!PINATA_JWT) {
  console.error("❌ Error: 请先设置环境变量 PINATA_JWT");
  process.exit(1);
}

async function uploadDist() {
  const distPath = path.join(process.cwd(), "dist");

  if (!fs.existsSync(distPath)) {
    console.error("❌ dist 文件夹不存在，请先运行 npm run build");
    process.exit(1);
  }

  const form = new FormData();

  /**
   * 递归添加文件到 FormData
   * @param {string} dir - 当前目录
   * @param {string} base - 相对路径，用于 Pinata filepath
   */
  function addFiles(dir, base = "") {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      const relativePath = path.join(base, item);

      if (stat.isDirectory()) {
        addFiles(fullPath, relativePath);
      } else {
        form.append("file", fs.createReadStream(fullPath), {
          filepath: relativePath, // 必须使用 filepath
        });
      }
    }
  }

  addFiles(distPath);

  // 设置 metadata 和 options
  form.append(
    "pinataMetadata",
    JSON.stringify({
      name: "vite-dapp-upload", // 可修改成你想要的名字
    })
  );

  form.append(
    "pinataOptions",
    JSON.stringify({
      cidVersion: 1,
    })
  );

  console.log("📦 开始上传 dist 文件夹到 Pinata...");

  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      form,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log("🎉 上传成功！");
    console.log("CID:", res.data.IpfsHash);
    const cid = res.data.IpfsHash;
    console.log(`访问链接: https://${cid}.ipfs.dweb.link`);
  } catch (err) {
    console.error("❌ 上传失败：", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
    process.exit(1);
  }
}

// 执行上传
uploadDist();
