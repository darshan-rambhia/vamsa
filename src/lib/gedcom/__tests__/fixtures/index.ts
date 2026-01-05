import fs from 'fs';
import path from 'path';

export const fixtures = {
  simplePerson: () => fs.readFileSync(path.join(__dirname, 'simple-person.ged'), 'utf-8'),
  threeGeneration: () => fs.readFileSync(path.join(__dirname, 'three-generation.ged'), 'utf-8'),
  multipleMarriages: () => fs.readFileSync(path.join(__dirname, 'multiple-marriages.ged'), 'utf-8'),
  sameSexCouple: () => fs.readFileSync(path.join(__dirname, 'same-sex-couple.ged'), 'utf-8'),
  dateFormats: () => fs.readFileSync(path.join(__dirname, 'date-formats.ged'), 'utf-8'),
  specialNames: () => fs.readFileSync(path.join(__dirname, 'special-names.ged'), 'utf-8'),
  longNotes: () => fs.readFileSync(path.join(__dirname, 'long-notes.ged'), 'utf-8'),
  sparseData: () => fs.readFileSync(path.join(__dirname, 'sparse-data.ged'), 'utf-8'),
  largeFamily: () => fs.readFileSync(path.join(__dirname, 'large-family.ged'), 'utf-8'),
  fullDetails: () => fs.readFileSync(path.join(__dirname, 'full-details.ged'), 'utf-8'),
};
