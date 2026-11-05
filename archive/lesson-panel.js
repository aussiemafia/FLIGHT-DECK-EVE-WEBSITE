(() => {
 const panel=document.getElementById('lesson-panel');
 const examples={
   dscan:{label:'Load practice scan',fields:{scan:'01\tSurvey One\tVenture\t1 AU\n02\tSurvey Two\tVenture\t2 AU\n03\tEscort\tDrake\t3 AU',typecol:'3'},target:'scanResults'},
   estimate:{label:'Load practice numbers',fields:{yield:'100',cycle:'60',modules:'1',ships:'1',volume:'1',price:'100',uptime:'100',tax:'0'},target:'income'},
   split:{label:'Try an equal split',fields:{loot:'12000000',costs:'0',pilots:'Ray, 1\nCryon, 1\nWingmate, 1'},target:'pilots'},
   'blue-loot':{label:'Find buyers for a Sleeper Data Library',fields:{buyerItem:'30745'},target:'buyerResults'}
 };
 function draw(){
   const route=document.body.dataset.view, lesson=flightLessons[route];
   panel.hidden=!lesson;if(!lesson)return;
   const [,intro,...steps]=lesson, title=document.createElement('h2'), description=document.createElement('p'), list=document.createElement('ol');
   title.textContent=lesson[0];description.textContent=intro;
   for(const step of steps){const li=document.createElement('li');li.textContent=step;list.append(li)}
   panel.replaceChildren(title,description,list);
   const example=examples[route];if(!example)return;
   const button=document.createElement('button');button.textContent=example.label;
   button.onclick=()=>{
     for(const [id,value] of Object.entries(example.fields)){
       const field=document.getElementById(id);if(!field)continue;
       field.value=value;field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}));
     }
     document.getElementById(example.target)?.scrollIntoView({block:'center'});
   };
   panel.append(button);
 }
 new MutationObserver(draw).observe(document.body,{attributes:true,attributeFilter:['data-view']});draw();
})();
