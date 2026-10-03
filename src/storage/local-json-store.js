import fs from 'node:fs';
import path from 'node:path';

function atomicWrite(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive:true });
  const temp = filePath + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, filePath);
}

export class LocalJsonStore {
  constructor(baseDir = '.data/state') {
    this.baseDir = path.resolve(baseDir);
    fs.mkdirSync(this.baseDir, { recursive:true });
  }

  file(name) {
    return path.join(this.baseDir, name + '.json');
  }

  read(name, fallback = []) {
    const file = this.file(name);
    if (!fs.existsSync(file)) return structuredClone(fallback);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  write(name, value) {
    atomicWrite(this.file(name), value);
    return structuredClone(value);
  }

  listApprovals() {
    return this.read('approvals', []);
  }

  saveApprovals(rows) {
    return this.write('approvals', rows);
  }

  listAudit() {
    return this.read('audit', []);
  }

  appendAudit(event) {
    const rows = this.listAudit();
    rows.push(event);
    this.write('audit', rows);
    return event;
  }
}
