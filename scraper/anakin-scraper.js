/**
 * First Gen Navigator — Anakin Web Scraper
 * =========================================
 * Uses the Anakin SDK (@anakin-io/sdk) to fetch real, live data from:
 *  - NIRF Rankings (nirfindia.org)
 *  - JoSAA / CSAB cutoff data
 *  - NSP Scholarship portal
 *  - e-Kalyan Jharkhand scholarship portal
 *  - NIT Jamshedpur, BIT Mesra, BIT Sindri, IIIT Ranchi websites
 *
 * Anakin SDK response shapes:
 *   client.search(prompt) → { id, results: [{ snippet, title, url, date, last_updated }] }
 *   client.scrape(url)    → { id, status, url, markdown, html, cleanedHtml, ... }
 *
 * Usage: node scraper/anakin-scraper.js
 */

import 'dotenv/config';
import { Anakin } from '@anakin-io/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anakin({ apiKey: process.env.ANAKIN_API_KEY });
const OUTPUT_PATH = path.join(__dirname, '..', 'scraper', 'scraped-data.json');

function log(section, msg) {
  console.log(`[Anakin Scraper][${section}] ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Extract combined snippet text from search results
function extractSearchText(searchRes) {
  if (!searchRes || !searchRes.results) return '';
  return searchRes.results.map(r => `${r.title || ''}: ${r.snippet || ''}`).join('\n\n');
}

// ─── Scrape: NIRF Engineering Rankings ──────────────────────────────────────
async function scrapeNIRFRankings() {
  log('NIRF', 'Searching NIRF 2024 Engineering Rankings...');
  try {
    const doc = await client.scrape('https://www.nirfindia.org/Rankings/2024/EngineeringRanking.html');
    log('NIRF', `Scraped NIRF page: ${doc.markdown?.length || 0} chars`);

    const search = await client.search('NIRF 2024 engineering college ranking NIT Jamshedpur BIT Mesra IIIT Ranchi NIT Patna NIT Durgapur rank');
    log('NIRF', `Search: ${searchRes(search)}`);

    return {
      markdown: doc.markdown || '',
      searchResults: search.results || [],
      searchText: extractSearchText(search)
    };
  } catch (err) {
    log('NIRF', `Error: ${err.message}`);
    return { searchText: '', searchResults: [] };
  }
}

// ─── Scrape: JoSAA Cutoffs ──────────────────────────────────────────────────
async function scrapeJoSAACutoffs() {
  log('JoSAA', 'Searching JoSAA 2024 cutoffs...');
  try {
    const search = await client.search('JoSAA 2024 closing rank cutoff NIT Jamshedpur BIT Mesra IIIT Ranchi CSE OBC-NCL GEN category percentile rank');
    log('JoSAA', `Search: ${searchRes(search)}`);
    return { searchText: extractSearchText(search), searchResults: search.results || [] };
  } catch (err) {
    log('JoSAA', `Error: ${err.message}`);
    return { searchText: '', searchResults: [] };
  }
}

// ─── Scrape: NIT Jamshedpur ──────────────────────────────────────────────────
async function scrapeNITJamshedpur() {
  log('NIT-JSR', 'Scraping NIT Jamshedpur...');
  try {
    const doc = await client.scrape('https://www.nitjsr.ac.in');
    log('NIT-JSR', `Scraped: ${doc.markdown?.length || 0} chars`);

    const search = await client.search('NIT Jamshedpur annual fee 2024 tuition hostel category OBC SC ST NIRF rank placement');
    log('NIT-JSR', `Search: ${searchRes(search)}`);

    return {
      markdown: doc.markdown || '',
      searchText: extractSearchText(search),
      searchResults: search.results || []
    };
  } catch (err) {
    log('NIT-JSR', `Error: ${err.message}`);
    return { markdown: '', searchText: '', searchResults: [] };
  }
}

// ─── Scrape: NSP Scholarships ────────────────────────────────────────────────
async function scrapeNSPScholarships() {
  log('NSP', 'Scraping NSP & scholarships...');
  try {
    const doc = await client.scrape('https://scholarships.gov.in');
    log('NSP', `Scraped NSP: ${doc.markdown?.length || 0} chars`);

    const search = await client.search('NSP National Scholarship 2024-25 post matric OBC SC ST amount income limit eligibility engineering');
    log('NSP', `Search: ${searchRes(search)}`);

    return {
      markdown: doc.markdown || '',
      searchText: extractSearchText(search),
      searchResults: search.results || []
    };
  } catch (err) {
    log('NSP', `Error: ${err.message}`);
    return { markdown: '', searchText: '', searchResults: [] };
  }
}

// ─── Scrape: e-Kalyan Jharkhand ──────────────────────────────────────────────
async function scrapeEKalyan() {
  log('eKalyan', 'Searching e-Kalyan Jharkhand scholarship...');
  try {
    const search = await client.search('e-Kalyan Jharkhand scholarship 2024 OBC ST SC post matric income limit amount engineering students');
    log('eKalyan', `Search: ${searchRes(search)}`);

    return {
      searchText: extractSearchText(search),
      searchResults: search.results || []
    };
  } catch (err) {
    log('eKalyan', `Error: ${err.message}`);
    return { searchText: '', searchResults: [] };
  }
}

// ─── Scrape: BIT Mesra ───────────────────────────────────────────────────────
async function scrapeBITMesra() {
  log('BIT-MESRA', 'Scraping BIT Mesra...');
  try {
    const doc = await client.scrape('https://www.bitmesra.ac.in');
    log('BIT-MESRA', `Scraped: ${doc.markdown?.length || 0} chars`);

    const search = await client.search('BIT Mesra Ranchi fee structure 2024 tuition hostel BTech NIRF rank placement');
    log('BIT-MESRA', `Search: ${searchRes(search)}`);

    return {
      markdown: doc.markdown || '',
      searchText: extractSearchText(search),
      searchResults: search.results || []
    };
  } catch (err) {
    log('BIT-MESRA', `Error: ${err.message}`);
    return { markdown: '', searchText: '', searchResults: [] };
  }
}

// ─── Scrape: JEE Main Percentile Context ─────────────────────────────────────
async function scrapeJEEContext() {
  log('JEE', 'Searching JEE Main 2024 percentile/rank context...');
  try {
    const search = await client.search('JEE Main 2024 percentile rank NIT OBC GEN category closing rank comparison');
    log('JEE', `Search: ${searchRes(search)}`);
    return { searchText: extractSearchText(search), searchResults: search.results || [] };
  } catch (err) {
    log('JEE', `Error: ${err.message}`);
    return { searchText: '', searchResults: [] };
  }
}

function searchRes(s) {
  if (!s || !s.results || !s.results[0]) return '(no results)';
  return s.results[0].snippet?.substring(0, 100) + '...';
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  First Gen Navigator — Anakin Scraper Starting');
  console.log('══════════════════════════════════════════════════\n');

  if (!process.env.ANAKIN_API_KEY) {
    console.error('ERROR: ANAKIN_API_KEY not set in .env');
    process.exit(1);
  }

  log('Init', `API Key: ${process.env.ANAKIN_API_KEY.substring(0, 12)}...`);

  const results = {};

  log('Run', 'Step 1/7 — NIRF Rankings');
  results.nirf = await scrapeNIRFRankings();
  await sleep(2000);

  log('Run', 'Step 2/7 — JoSAA Cutoffs');
  results.josaa = await scrapeJoSAACutoffs();
  await sleep(2000);

  log('Run', 'Step 3/7 — NIT Jamshedpur');
  results.nitJsr = await scrapeNITJamshedpur();
  await sleep(2000);

  log('Run', 'Step 4/7 — NSP Scholarships');
  results.nsp = await scrapeNSPScholarships();
  await sleep(2000);

  log('Run', 'Step 5/7 — e-Kalyan Jharkhand');
  results.ekalyan = await scrapeEKalyan();
  await sleep(2000);

  log('Run', 'Step 6/7 — BIT Mesra');
  results.bitMesra = await scrapeBITMesra();
  await sleep(2000);

  log('Run', 'Step 7/7 — JEE Main Context');
  results.jee = await scrapeJEEContext();

  results.scrapedAt = new Date().toISOString();
  results.source = 'Anakin Web Scraper (anakin.io)';

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf8');
  log('Done', `Raw scraped data → ${OUTPUT_PATH}`);

  await generateEnrichedData(results);

  console.log('\n══════════════════════════════════════════════════');
  console.log('  Scraping Complete! Restart proxy to use live data.');
  console.log('══════════════════════════════════════════════════\n');
}

// ─── Enrich: use scraped text to build structured college + scholarship data ──
async function generateEnrichedData(raw) {
  log('Enrich', 'Generating enriched data from scraped content...');

  const allText = [
    raw.nirf?.searchText,
    raw.josaa?.searchText,
    raw.nitJsr?.searchText,
    raw.bitMesra?.searchText,
    raw.nsp?.searchText,
    raw.ekalyan?.searchText,
    raw.jee?.searchText
  ].filter(Boolean).join('\n\n').substring(0, 3000);

  let enrichedColleges = null;
  let enrichedScholarships = null;

  try {
    const colSearch = await client.search(
      `Based on 2024 data: What are the NIRF ranks, annual tuition fees, hostel fees, and JEE Main OBC-NCL closing percentile for: NIT Jamshedpur, BIT Sindri, BIT Mesra Ranchi, IIIT Ranchi, NIT Patna, NIT Durgapur?`
    );
    enrichedColleges = {
      searchResults: colSearch.results || [],
      combinedText: extractSearchText(colSearch)
    };
    log('Enrich', `Colleges: ${colSearch.results?.length || 0} results`);
  } catch (e) {
    log('Enrich', `College enrich error: ${e.message}`);
  }

  await sleep(2000);

  try {
    const schSearch = await client.search(
      'NSP scholarship 2024-25 OBC post matric amount annual income limit e-Kalyan Jharkhand PM YASASVI SC ST engineering college'
    );
    enrichedScholarships = {
      searchResults: schSearch.results || [],
      combinedText: extractSearchText(schSearch)
    };
    log('Enrich', `Scholarships: ${schSearch.results?.length || 0} results`);
  } catch (e) {
    log('Enrich', `Scholarship enrich error: ${e.message}`);
  }

  const enrichedPath = path.join(__dirname, '..', 'scraper', 'enriched-data.json');
  const enriched = {
    colleges: enrichedColleges,
    scholarships: enrichedScholarships,
    jee: raw.jee,
    nitJsrMarkdown: raw.nitJsr?.markdown?.substring(0, 5000) || '',
    nitJsrSearchText: raw.nitJsr?.searchText || '',
    bitMesraSearchText: raw.bitMesra?.searchText || '',
    josaaSearchText: raw.josaa?.searchText || '',
    nspSearchText: raw.nsp?.searchText || '',
    ekalyanSearchText: raw.ekalyan?.searchText || '',
    enrichedAt: new Date().toISOString()
  };

  fs.writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2), 'utf8');
  log('Enrich', `Enriched data → ${enrichedPath}`);
}

main().catch(err => {
  console.error('Fatal scraper error:', err);
  process.exit(1);
});
