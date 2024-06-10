import {
  featuresContaining,
  aggregateFeature,
} from '@rapideditor/country-coder';
import removeAccents from 'remove-accents';
import { readFileSync } from 'fs';

const json = readFileSync('./src/data/valid-guesses.json', 'utf-8');
const guessData = JSON.parse(json);

export const normalizeAnswer = (str) => {
  return removeAccents(str)
    .toUpperCase()
    .replace(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g, '');
};

export const validateGuess = (guess) => {
  if (typeof guess !== 'string') return false;

  const normalizedGuess = normalizeAnswer(guess);

  let found;

  if (normalizedGuess.length === 2) {
    found = guessData.find((el) => el.iso1A2 === normalizedGuess);
  }

  if (normalizedGuess.length === 3 && !found) {
    found = guessData.find((el) => el.iso1A3 === normalizedGuess);
  }

  if (!found) {
    found = guessData.find((el) => el.names.includes(normalizedGuess));
  }

  if (found) {
    return {
      id: found.id,
      iso1A2: found.iso1A2 ? found.iso1A2 : '',
      iso1A3: found.iso1A3 ? found.iso1A3 : '',
      iso1N3: found.iso1N3 ? found.iso1N3 : '',
      location: found.nameEn,
    };
  }

  return false;
};

export const extractAfterCommand = (input) => {
  const match = input.match(/^![^\s]+\s+(.*)$/);
  return match ? match[1] : '';
};

export const getPossibleAnswers = async (latlong) => {
  const possibleAnswers = [];
  const wikiData = [];
  const features = featuresContaining(latlong);

  const addFeature = (feature) => {
    possibleAnswers.push(feature.properties?.iso1A2);
    possibleAnswers.push(feature.properties?.iso1A3);
    possibleAnswers.push(feature.properties?.nameEn);
    wikiData.push(feature.properties?.wikidata);
    feature.properties.aliases?.forEach((alias) => {
      possibleAnswers.push(alias);
    });
  };

  // if the lowest level is 'country'
  if (
    features[0].properties.level === 'country' &&
    features[1].properties.level !== 'sharedLandform'
  ) {
    addFeature(features[0]);
  } else if (
    features[0].properties.level === 'country' &&
    features[1].properties.level === 'sharedLandform'
  ) {
    addFeature(features[0]);
    addFeature(features[1]);
  } else {
    features.forEach((feature) => {
      const level = feature.properties.level;

      if (level === 'subterritory') {
        addFeature(feature);
      }

      if (level === 'territory') {
        addFeature(feature);
      }

      if (level === 'subcountryGroup') {
        addFeature(feature);
      }

      if (level === 'country') {
        addFeature(feature);
      }
    });
  }

  const filteredAnswers = possibleAnswers.filter(
    (val) => val !== undefined && val !== null
  );
  const filteredWikiData = wikiData.filter(
    (val) => val !== undefined && val !== null
  );
  const wikiDataQueryIds = filteredWikiData.join('|');

  const languages = ['tr', 'en', 'fr', 'de', 'es', 'pt', 'it', 'nl', 'se'];

  const wikiResponse = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikiDataQueryIds}&props=labels&languages=${languages.join(
      '|'
    )}&format=json`
  );
  const data = await wikiResponse.json();

  // add languages
  filteredWikiData.forEach((entity) => {
    languages.forEach((lang) =>
      filteredAnswers.push(data.entities[entity].labels[lang]?.value)
    );
  });

  const cleanAnswers = filteredAnswers
    .filter((val) => val !== undefined && val !== null)
    .map((val) => normalizeAnswer(val));

  if (cleanAnswers.includes('MARTINIQUE')) {
    cleanAnswers.push('MARTINIK');
  }

  if (cleanAnswers.includes('USA')) {
    cleanAnswers.push('ABD');
  }

  if (cleanAnswers.includes('DK')) {
    cleanAnswers.push('DENMARK');
  }

  if (cleanAnswers.includes('UNITED ARAB EMIRATES')) {
    cleanAnswers.push('UAE');
  }

  if (cleanAnswers.includes('TAIWAN')) {
    cleanAnswers.push('TAYVAN');
  }

  if (cleanAnswers.includes('FRENCH GUIANA')) {
    cleanAnswers.push('FRANSIZ GUYANASI');
  }

  if (cleanAnswers.includes('NORTHERN CYPRUS')) {
    cleanAnswers.push('KKTC');
  }

  if (cleanAnswers.includes('SOUTH AFRICA')) {
    cleanAnswers.push('GUNEY AFRIKA');
  }

  const uniqueCleanAnswers = [...new Set(cleanAnswers)];

  return uniqueCleanAnswers;
};

export const getPossibleAnswersFromShortGoogleUrl = async (url) => {
  if (!url.startsWith('https://maps.app.goo.gl/')) {
    throw new Error(
      'Yanlış link formatı. Link `https://maps.app.goo.gl/` ile başlamalıdır. Street View sayfasındaki üç noktaya tıklayıp bu formatta kısa link alabilirsiniz.'
    );
  }

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      'Google maps linkini açarken bir hata oluştu. Daha sonra tekrar deneyin.'
    );
  }

  const fullUrl = res.url;
  const match = fullUrl.match(/@([-]?\d+\.\d+),([-]?\d+\.\d+)/);

  if (!match) {
    throw new Error(
      'Açtığım google maps linkinde koordinatları bulamadım. Tekrar deneyin. Yine çalışmazsa atmaya çalıştığınız linki yetkiliye gönderin.'
    );
  }

  const numbers = match.slice(1).map((val) => Number(val));

  const temp = numbers[0];
  numbers[0] = numbers[1];
  numbers[1] = temp;

  const possibleAnswers = await getPossibleAnswers(numbers);
  console.log('------------POSSIBLE ANSWERS------------');
  console.log(possibleAnswers);
  console.log('----------------------------------------');
  return possibleAnswers;
};
