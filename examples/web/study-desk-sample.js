/**
 * Fully original, fictional, MIT-licensed teaching content.
 * A single content pack drives fraction visuals, number line, chronology,
 * prerequisite connections, lessons, questions and the learning path.
 */
export const STUDY_DESK_SAMPLE = {
  format:'fark-open-content-pack',version:1,
  attribution:{
    title:'Three Ways to See a Lesson',
    creator:'FARK Study Engine contributors',
    license:'MIT'
  },
  units:[
    {id:'fractions',label:'Equal parts and fractions'},
    {id:'integers',label:'Signed numbers'},
    {id:'stories',label:'Imaginary town stories'}
  ],
  outcomes:[
    {id:'equal-parts',unitId:'fractions',label:'Recognize equal parts'},
    {id:'compare-fractions',unitId:'fractions',label:'Compare unit fractions',
      prerequisiteIds:['equal-parts']},
    {id:'signed-position',unitId:'integers',label:'Position signed integers'},
    {id:'fictional-order',unitId:'stories',label:'Order fictional events'}
  ],
  lessons:[
    {id:'lesson-equal',revision:'1',title:'Every piece is equal',
      outcomeIds:['equal-parts'],
      bodyText:'The pieces of one whole must be the same size. Dividing a whole into four equal pieces creates quarters.'},
    {id:'lesson-fraction',revision:'1',title:'Compare the size of one piece',
      outcomeIds:['compare-fractions'],
      bodyText:'When the whole stays the same size, dividing it into more equal parts makes each individual part smaller. One third is larger than one fourth.',
      visual:{kind:'fraction-comparison',
        left:{numerator:1,denominator:3},right:{numerator:1,denominator:4}}},
    {id:'lesson-line',revision:'1',title:'On either side of zero',
      outcomeIds:['signed-position'],
      bodyText:'Negative numbers are to the left of zero. Positive numbers are to its right. Find -3, 0 and 4 along one evenly divided line.',
      visual:{kind:'number-line',min:-5,max:5,points:[-3,0,4]}},
    {id:'lesson-events',revision:'1',title:'The fictional library timeline',
      outcomeIds:['fictional-order'],
      bodyText:'In this completely invented town, the reading room came after the archive. A timeline arranges the invented events in numeric year order; these are not real historical facts.',
      visual:{kind:'timeline',events:[
        {id:'archive',year:1860,label:'Imaginary archive founded'},
        {id:'reading',year:1872,label:'Imaginary reading room opens'},
        {id:'library',year:1895,label:'Imaginary library expands'}
      ]}}
  ],
  questions:[
    {id:'q-equal',revision:'1',outcomeIds:['equal-parts'],
      prompt:'Which statement describes equal parts?',correctChoiceId:'a',
      choices:[{id:'a',text:'Every part has the same size.'},
        {id:'b',text:'The parts can have different sizes.'}]},
    {id:'q-fraction-a',revision:'1',outcomeIds:['compare-fractions'],
      prompt:'Which is larger when the whole is the same size?',correctChoiceId:'a',
      choices:[{id:'a',text:'1/3'},{id:'b',text:'1/4',misconceptionId:'denominator-size'}]},
    {id:'q-fraction-b',revision:'1',outcomeIds:['compare-fractions'],
      prompt:'Which fraction is larger when the whole is the same size?',correctChoiceId:'a',
      choices:[{id:'a',text:'2/5'},{id:'b',text:'2/7'}]},
    {id:'q-line',revision:'1',outcomeIds:['signed-position'],
      prompt:'Which marked integer is left of zero?',correctChoiceId:'b',
      choices:[{id:'a',text:'4'},{id:'b',text:'-3'}]},
    {id:'q-events',revision:'1',outcomeIds:['fictional-order'],
      prompt:'Which imaginary town event came first?',correctChoiceId:'a',
      choices:[{id:'a',text:'Imaginary archive founded'},
        {id:'b',text:'Imaginary library expands'}]}
  ]
};
