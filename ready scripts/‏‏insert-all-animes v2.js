const pg = require('pg');
const connectionString = 'postgres://AnimeLogger:1q2w3e4r5y@localhost:5432/AnimeLogger';

const client = new pg.Client(connectionString);

const htmlPage = ''
const https = require('https');
const html2json = require('html2json').html2json;

let insertedDocs = 0;

animeNames = [];

https.get('https://eyeonanime.tv/anime-list/', (resp) => {
  
  let data = '';
  
  resp.on('data', (chunk) => {
    data += chunk;
  })

  resp.on('end', () => {
    const finalData =  trimHtmlPage(data);
    const jsonPage = html2json(finalData);
    
    let animeGroupsContainer = [];
    searchAttrRecursivly(jsonPage, 'id', 'sct_content', animeGroupsContainer)

    animeGroupsContainer = animeGroupsContainer[0];

    let animes = [];

    client.connect();

    for (let child of animeGroupsContainer.child) {
      if (child.tag === 'ul') {
        let animeGroup = child;

        for (let anime of animeGroup.child) {
          let animeName = anime.child[0].child[0].text;
          let animeDetailsLink = anime.child[0].attr.href;

          console.log('inserting ' + animeName);
          const query = client.query('insert into animes values(uuid_generate_v4(), $1, 0, \'\', $2)', [animeName, animeDetailsLink], (err, res) => {
            if (err) {
              console.log("Error inserting " + animeName + ". " + err.message);
            }
          });
          query.on('end', () => {
            insertedDocs++;
            console.log('finished inserting ' + animeName);

            if (animes.length === insertedDocs) {
              client.end();
            }
          })
        }
      }
    }
  })
}).on('error', (err) => { 
  console.log('Error: ' + err.message);
}) 

function searchAttrRecursivly(element, attrName, attrValue, results) {
  if (element.attr) {
    if (typeof(element.attr[attrName]) === 'string') {
      if (element.attr[attrName] === attrValue) {
        results.push(element);
      }
    } else {
      if (element.attr[attrName] && element.attr[attrName].indexOf(attrValue)) {
        console.log(element);
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

function trimHtmlPage(page) {
  page = page.substring(page.indexOf('>') + 1);
  page = page.substring(0, page.lastIndexOf('<'));
  page = page.substring(0, page.lastIndexOf('<'));
  page = page.substring(0, page.lastIndexOf('<'));

  return page;
}