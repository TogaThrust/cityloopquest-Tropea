/**
 * Lie chaque POI de pois_explorer.json à son image dans images/points interets/.
 * Usage: node scripts/link-tropea-poi-photos.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { imagePathsFromFile } from "./lib/poi-image-resolve.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(root, "data", "pois_explorer.json");
const imgDir = path.join(root, "images", "points interets");

/** Correspondance 1:1 POI id → fichier image (58 POI / 58 photos). */
const POI_IMAGE_MAP = {
  "tropea-grand-place": "grandplace.jpg",
  "tropea-hotel-de-ville": "hoteldeville.jpg",
  "tropea-singe-grand-garde": "singe.jpg",
  "tropea-musee-doudou": "jardinmayeur.jpg",
  "tropea-theatre-royal": "theatreroyal.jpg",
  "tropea-artotheque": "artotheque.jpg",
  "tropea-beffroi": "beffroy.jpg",
  "tropea-maison-patrimoines-unesco": "maisonespagnole.jpg",
  "tropea-chapelle-saint-calixte": "calixte.jpg",
  "tropea-eglise-sainte-elisabeth": "sainteelisabeth.jpg",
  "tropea-maison-losseau": "maisonlosseau.jpg",
  "tropea-eglise-saint-nicolas": "eglisenicolas.jpg",
  "tropea-car-dor": "cardor.jpg",
  "tropea-collegiale-sainte-waudru": "collegialesaintewaudru.jpg",
  "tropea-tresor-sainte-waudru": "tresors.jpg",
  "tropea-mundaneum": "mundaneum.jpg",
  "tropea-memorial-museum": "memorial.jpg",
  "tropea-parc-waux-hall": "parcduwauxhall.jpg",
  "tropea-bam": "bam.jpg",
  "tropea-grand-large": "grandlarge.jpg",
  "cuesmes-maison-van-gogh": "maisonvanGogh.jpg",
  "spiennes-silexs": "silexs.jpg",
  "saint-symphorien-cemetery": "saint-symphorien-cemetery.jpg",
  "frameries-sparkoh": "sparkoh.jpg",
  "havre-chateau": "havre-chateau.jpg",
  "hornu-cid": "cid.jpg",
  "hornu-macs": "macs.jpg",
  "hornu-grand-hornu": "grand-hornu.jpg",
  "saint-ghislain-musee-foire": "saint-ghislain-musee-foire.jpg",
  "boussu-chateau": "chateau-de-boussu.jpg",
  "strepy-thieu-ascenseur": "ascenseur-funiculaire-de-strepy-thieu.jpg",
  "haulchin-vignoble-agaises": "vignoble-des-agaises.jpg",
  "canal-centre-lifts":
    "ascenseurs-hydrauliques-historiques-du-canal-du-centre.jpg",
  "blaugies-brasserie": "brasserie-de-blaugies.jpg",
  "bois-du-luc": "bois-du-luc.jpg",
  "dour-belvedere": "belvedere-de-dour.jpg",
  "brugelette-pairi-daiza": "pairi-daiza.jpg",
  "binche-beffroi-hotel-ville": "binche.jpg",
  "binche-mumask": "mumask.jpg",
  "binche-remparts": "remparts.jpg",
  "louvignies-chateau": "louvignies.jpg",
  "harchies-marais": "harchies.jpg",
  "beloeil-chateau": "beloeil.jpg",
  "attre-chateau": "attre.jpg",
  "mariemont-musee": "mariemont.jpg",
  "honnelles-caillou-qui-bique": "honnelles.jpg",
  "bernissart-iguanodon": "iguanodon.jpg",
  "ath-espace-gallo-romain": "ath.jpg",
  "ath-maison-geants": "geants.jpg",
  "seneffe-chateau": "seneffe.jpg",
  "aubechies-archeosite": "aubechies.jpg",
  "thuin-beffroi": "thuin.jpg",
  "lessines-notre-dame-rose": "notredame.jpg",
  "charleroi-beffroi": "charleroi.jpg",
  "charleroi-bois-cazier": "bois-du-cazier.jpg",
  "tournai-beffroi": "tournai.jpg",
  "tournai-cathedrale": "ndtournai.jpg",
  "tournai-pont-trous": "pont-trous.jpg",
};

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const diskFiles = new Set(
  fs.readdirSync(imgDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
);

const usedFiles = new Set();
let linked = 0;
const missing = [];
const unknown = [];

for (const poi of data.pois) {
  const file = POI_IMAGE_MAP[poi.id];
  if (!file) {
    unknown.push(poi.id);
    continue;
  }
  if (!diskFiles.has(file)) {
    missing.push({ id: poi.id, file });
    continue;
  }
  const { image, photos } = imagePathsFromFile(file);
  poi.image = image;
  poi.photos = photos;
  usedFiles.add(file);
  linked += 1;
}

const unused = [...diskFiles].filter((f) => !usedFiles.has(f));

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`Linked ${linked}/${data.pois.length} POI in ${jsonPath}`);
if (unknown.length) console.warn("No mapping:", unknown.join(", "));
if (missing.length) {
  console.warn("Missing files:");
  missing.forEach((m) => console.warn(`  ${m.id} → ${m.file}`));
}
if (unused.length) console.warn("Unused images:", unused.join(", "));

if (unknown.length || missing.length) process.exit(1);
