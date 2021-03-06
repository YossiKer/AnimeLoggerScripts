const pg = require('pg');
const connectionString = 'postgres://AnimeLogger:1q2w3e4r5y@localhost:5432/AnimeLogger';
const htmlPage = ''
const https = require('https');
const html2json = require('html2json').html2json;

const client = new pg.Client(connectionString);

function searchAttrRecursivly(element, attrName, attrValue, results) {
  if (element.attr) {
    if (typeof(element.attr[attrName]) === 'string') {
      if (element.attr[attrName] === attrValue) {
        results.push(element);
      }
    } else {
      if (element.attr[attrName] && element.attr[attrName].indexOf(attrValue) !== -1) {
        results.push(element);
      }
    }
  }

  if (element.child && element.child.length !== 0) {
    for (let child of element.child) {
      searchAttrRecursivly(child, attrName, attrValue, results);
    }
  } else {
    return;
  }
}

function parseAnimeName(name) {
  let parsedName = name.trim();
  parsedName = parsedName.replace(/[^- \w]/g, '');
  parsedName = parsedName.replace(/[- ]{1,}/g, '-');

  return parsedName;
}

function parseHtmlPage(page) {
  let parsedPage = page.substring(page.indexOf('<body>'), page.indexOf('</body>') + 7);

  return parsedPage;
}

function bulkUpdate (startIndex, bulkSize, rows) {

  for (let rowIndex = startIndex; rowIndex < (startIndex + bulkSize) && rowIndex < rows.length; rowIndex++) {
    let row = rows[rowIndex];
    let anime_name = row.anime_name;
    let anime_details_link = row.anime_details_link;

    canSendRequest = false;
    console.log('getting data from ' + anime_details_link);
    https.get(anime_details_link, 
      (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
          data += chunk;
        })
        resp.on('end', () => {
          console.log('got data from ' + anime_details_link);
          data = data.substring(data.indexOf('>') + 1);
          data = parseHtmlPage(data);
          let parsedData = html2json(data);
          let results = [];
          searchAttrRecursivly(parsedData, 'class', 'ws-episodelist', results);

          let latestEpisode = results[0].child[1].child[0].child[0].text;
      
          results = [];
          searchAttrRecursivly(parsedData, 'class', 'ws-description', results);
          let imagePath = results[0].child[0].attr.src;
          client.query('update animes set anime_image_url=$1, latest_episode=$2 where anime_name=$3', [imagePath, latestEpisode, anime_name], (err, res) => {
            if (err) {
              console.log('Error updating ' + anime_name + ': ' + err.message);
            } else {
              console.log('updated ' + anime_name + '\'s image path to : ' + imagePath + ' and latest episode to : ' + latestEpisode);
            }
          })
          canSendRequest = true;
          updatedDocs++;
        })
      }
    ).on("error", 
      (err) => {
        console.log("Error: " + err.message);
      }
    );
  }

  return new Promise(resolve => {
    setTimeout(() => resolve('success'), 50000);
  });
}

let canSendRequest = true;
let updatedDocs = 0;

client.connect();
const getAnimes = client.query('select anime_name, anime_details_link from animes order by anime_name', async (err, res) => {
  if (!err) {
    const bulkSize = 100;
    let bulkIndex = 1;

    for (let startIndex = 0; startIndex < res.rows.length; startIndex+=bulkSize) {
      let status = await bulkUpdate(startIndex, bulkSize, res.rows);
      console.log('====================================================');
      console.log('finished bulk number ' + bulkIndex + ' with status ' + status);
      console.log('====================================================');

      bulkIndex++;
    }
  } else {
    console.log(err.message);
  }

  client.end();
})


