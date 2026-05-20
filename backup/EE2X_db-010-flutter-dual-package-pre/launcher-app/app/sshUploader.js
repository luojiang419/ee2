/**
 * sshUploader.js
 * 通过SSH2将游戏结算CSV上传到服务器，并触发自动计分
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '115.231.35.105',
  port: 22,
  username: 'root',
  password: 'lhsgEMCF0380',
  readyTimeout: 10000
};

const REMOTE_BASE_DIR = '/opt/ee2x/ee2x_user-admin';
const REMOTE_CSV_DIR = `${REMOTE_BASE_DIR}/data/game-csv`;
const BATTLE_API_URL = 'http://localhost:3001/api/battle/submit';
const BATTLE_API_TOKEN = process.env.BATTLE_API_TOKEN || 'ee2x-battle-2026-secure-token';

/**
 * 上传CSV文件并触发服务器计分处理
 * @param {string} localCsvPath - 本地CSV文件完整路径
 * @returns {Promise<{success, duplicate, matched, unmatched, message}>}
 */
function uploadAndProcess(localCsvPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(localCsvPath)) {
      return reject(new Error('CSV文件不存在: ' + localCsvPath));
    }

    const fileName = path.basename(localCsvPath);
    const remotePath = `${REMOTE_CSV_DIR}/${fileName}`;
    const conn = new Client();

    conn.on('ready', () => {
      // Step 1: SFTP上传文件
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return reject(err); }

        const writeStream = sftp.createWriteStream(remotePath);
        const readStream = fs.createReadStream(localCsvPath);

        writeStream.on('close', () => {
          // Step 2: SSH执行curl通知服务器处理
          const curlCmd = `curl -s -X POST ${BATTLE_API_URL} `
            + `-H "Authorization: Bearer ${BATTLE_API_TOKEN}" `
            + `-H "Content-Type: application/json" `
            + `-d '{"csvFile":"${fileName}"}'`;

          conn.exec(curlCmd, (err, stream) => {
            if (err) { conn.end(); return reject(err); }

            let output = '';
            stream.on('data', d => output += d);
            stream.stderr.on('data', d => output += d);
            stream.on('close', () => {
              conn.end();
              try {
                const result = JSON.parse(output.trim());
                resolve(result);
              } catch (e) {
                resolve({ success: false, message: '服务器响应解析失败: ' + output });
              }
            });
          });
        });

        writeStream.on('error', err => { conn.end(); reject(err); });
        readStream.pipe(writeStream);
      });
    });

    conn.on('error', err => reject(err));
    conn.connect(SSH_CONFIG);
  });
}

module.exports = { uploadAndProcess };
