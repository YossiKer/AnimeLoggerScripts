const pg = require('pg');
const connectionString = 'postgres://AnimeLogger:1q2w3e4r5y@localhost:5432/AnimeLogger';

const client = new pg.Client(connectionString);
client.connect();

const htmlPage = ''
const https = require('https');
const html2json = require('html2json').html2json;

let insertedDocs = 0;

animeNames = [];

for (let page = 1; page < 50; page++) {
  console.log('checking url https://www4.gogoanime.se/anime-list.html?page=' + page);
    https.get('https://www4.gogoanime.se/anime-list.html?page=' + page, (resp) => {
      console.log('got data');
      let data = '';
     
      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });
     
      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        const jsonPage = html2json(data);
        let results = [];
        
        console.log('parsed data');

        searchClassRecursivly(jsonPage, 'listing', results);
        
        let linksText = [];

        for (let result of results) {
          getLinksInnerText(result, linksText);
        }

        for (let linkText of linksText) {
          animeNames.push(linkText);
        }

        if (animeNames.length === 5503) {
          let animes = [];
          console.log(animeNames);
          for (let animeName of animeNames) {
            console.log('inserting ' + animeName + 'to the database');
            animes.push(animeName);
            const query = client.query('insert into public."Animes" values(uuid_generate_v4(), $1, 0, \'\')',[animeName] ,(err, res) => {});
              query.on('end', () => { 
              insertedDocs = insertedDocs + 1;
              console.log('finished inserting ' + animeName + '. documents inserted: ' + insertedDocs);

              if (insertedDocs === 5502) {
                client.end(); 
              }

            });
          }
        }
        
        console.log('found items');

        if (results[0].child.length === 1 ) {
          noMorePages = true;
        } else {
          noMorePages = false;
        }

        
      console.log('checked page ' + page);
      page++;
      });
      
    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
} 

function searchClassRecursivly(element, className, results) {
  if (element.attr) {
    if (element.attr.class === className) {
      results.push(element);
    }
  }

  if (element.child && element.child.length !== 0) {
    for (let child of element.child) {
      searchClassRecursivly(child, className, results);
    }
  } else {
    return;
  }
}

function getLinksInnerText(element, results) {
  if (element.tag === 'a') {
    results.push(element.child[0].text);
  } else if (element.child) {
    if (element.child.length > 1) {
      for (let child of element.child) {
        getLinksInnerText(child, results);
      }
    } 
  }
}