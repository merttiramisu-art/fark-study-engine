/**
 * Original, synthetic curriculum for FARK Concept Map.
 * No source content, real students, or private KPSS materials are used.
 */
export const CONCEPT_MAP_SAMPLE = Object.freeze({
  format:'fark-open-content-pack', version:1,
  attribution:{
    title:'Original Fraction Concept Path',
    creator:'FARK Study Engine contributors',
    license:'MIT'
  },
  units:[
    {id:'whole-parts',label:'Parts of a whole'},
    {id:'fractions',label:'Fractions',prerequisiteIds:['whole-parts']}
  ],
  outcomes:[
    {id:'equal-parts',unitId:'whole-parts',label:'Recognize equal parts'},
    {id:'numerator',unitId:'fractions',label:'Understand numerator',prerequisiteIds:['equal-parts']},
    {id:'unit-fraction',unitId:'fractions',label:'Recognize unit fractions',prerequisiteIds:['numerator']},
    {id:'compare-fractions',unitId:'fractions',label:'Compare unit fractions',prerequisiteIds:['unit-fraction']},
    {id:'equivalent-fractions',unitId:'fractions',label:'Recognize equivalent fractions',prerequisiteIds:['unit-fraction']}
  ],
  lessons:[
    {id:'lesson-whole',revision:'1',outcomeIds:['equal-parts'],title:'Equal pieces',bodyText:'An equal partition divides the same whole into pieces of equal size.'},
    {id:'lesson-unit',revision:'1',outcomeIds:['unit-fraction'],title:'One equal part',bodyText:'One quarter means one of four equal parts of a whole.'},
    {id:'lesson-compare',revision:'1',outcomeIds:['compare-fractions'],title:'Compare one piece',bodyText:'Of the same whole, a third is larger than a fourth.'}
  ],
  questions:[
    {id:'q-parts',revision:'1',outcomeIds:['equal-parts'],prompt:'Which description means equal parts?',
      correctChoiceId:'b',choices:[
        {id:'a',text:'Pieces can have different sizes.'},
        {id:'b',text:'Every piece has the same size.'}]},
    {id:'q-unit',revision:'1',outcomeIds:['unit-fraction'],prompt:'Which fraction represents one of four equal parts?',
      correctChoiceId:'a',choices:[{id:'a',text:'1/4'},{id:'b',text:'4/1'}]},
    {id:'q-compare',revision:'1',outcomeIds:['compare-fractions'],prompt:'Which fraction is larger when the whole is the same?',
      correctChoiceId:'a',choices:[
        {id:'a',text:'1/3'},
        {id:'b',text:'1/4',misconceptionId:'denominator-size'}]},
    {id:'q-equivalent',revision:'1',outcomeIds:['equivalent-fractions'],prompt:'Which fraction represents the same amount as 1/2?',
      correctChoiceId:'b',choices:[{id:'a',text:'1/4'},{id:'b',text:'2/4'}]}
  ]
});
