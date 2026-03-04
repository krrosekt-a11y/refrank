# Cloudflare Pages Deploy (Static Snapshot)

Bu kurulum, uygulamayı backend olmadan online erişilebilir yapar.  
Veri kaynağı: `public/data/snapshot.json` (SQLite'dan export).

## 1) Snapshot üret

```bash
cd /Users/aliozkan/RefereeRank
python3 scripts/export_snapshot_json.py \
  --db /Users/aliozkan/RefereeRank/data/tff_referees_matches_full.db \
  --out /Users/aliozkan/RefereeRank/referee-vote-ui/public/data/snapshot.json
```

## 2) Build

```bash
cd /Users/aliozkan/RefereeRank/referee-vote-ui
npm install
npm run build
```

## 3) Cloudflare Pages ayarları

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `referee-vote-ui`

## 4) Deploy

- GitHub repo bağlayarak otomatik deploy aç
- veya `dist` klasörünü manuel upload et

## 5) Snapshot güncelleme rutini

DB güncellendikçe:

1. `export_snapshot_json.py` çalıştır
2. `npm run build`
3. Pages'e yeniden deploy

Bu sayede online site güncel veriyle kalır.

