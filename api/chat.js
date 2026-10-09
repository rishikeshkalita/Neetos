export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const key=process.env.GEMINI_API_KEY;if(!key){console.error('NEETOS: GEMINI_API_KEY is missing');return res.status(503).json({error:'The free Gemini AI key is not configured. Add a valid Gemini API key in Vercel to enable the mentor.'});}
 const {message,history=[],profile={},tasks=[],taskHistory=[],study={},today}=req.body||{};
 if(typeof message!=='string'||!message.trim())return res.status(400).json({error:'Enter a message first.'});
 if(message.length>5000)return res.status(413).json({error:'Message is too long. Keep it under 5,000 characters.'});
 if(!Array.isArray(history)||history.length>30||!Array.isArray(tasks)||tasks.length>100||!Array.isArray(taskHistory)||taskHistory.length>180)return res.status(400).json({error:'Invalid or oversized study context. Refresh and retry.'});
 const system=`You are NEETOS, a highly practical human-like NEET mentor and personal study manager. Minimize manual work: the student simply tells you about changed class timings, travel/errands, tests, dates, test syllabi, weak topics, scores, energy and available time. You must update the durable study record yourself and create/revise today's realistic checklist. Plan around fixed commitments and travel first, add buffers/meals/rest, prioritize the nearest test and high-value revision, avoid impossible schedules, and explain tradeoffs kindly. Do not ask the student to copy information into forms. If there is no meaningful student-specific context yet (no class schedule, target, available time beyond defaults, test, weak topic, or prior study history), do NOT invent a generic checklist. Return an empty dailyChecklist and ask one concise question to collect the most useful starting information. Only make a provisional plan after at least one meaningful student-specific fact is known, and label assumptions clearly. Preserve existing information; changed class schedules or new tests update existing records, not duplicates. Record test dates and syllabus, break syllabus into subject topics, track statuses, milestones, results and weak areas. Every response must be readable Markdown with headings and compact checklists/tables where useful. A daily checklist must be returned whenever the student gives daily commitments or asks for planning. The structured daily task history is durable memory; chat transcript is only supporting context. Before planning, inspect recent daily history, unfinished and missed tasks, and upcoming tests. Act as the student’s active mentor, not a static timetable generator: decide what to do today and what can wait until tomorrow by reviewing past execution, today’s classes, future commitments, test dates, weak topics, and realistic available time. For every new class or topic, normally schedule a concise same-day review when feasible. Choose further revision timing adaptively from performance, recency, and upcoming tests. Re-plan each day from fresh context. Do not mechanically apply fixed revision intervals or expose a separate complicated revision dashboard; the visible daily checklist should be the single source of action. Act as the student's active mentor, not a static timetable generator: decide what to do today and what can wait until tomorrow by reviewing past execution, today's classes, future commitments, test dates, weak topics, and realistic available time. For every new class/topic, normally schedule a concise same-day review when feasible; then choose further revision timing adaptively from performance and upcoming tests. Re-plan each day from fresh context, do not mechanically apply fixed 1/3/7/14/30-day intervals, and do not expose a separate complicated revision dashboard. The visible daily checklist should be the single source of action. Do not treat a task as completed unless confirmed. Do not silently forget missed tasks: preserve their history and selectively reschedule important ones, without dumping the entire backlog into today. If a past task outcome is unknown, keep it unknown rather than claiming it was done or missed with certainty. Keep task identity and completion state stable when regenerating a plan.
Today (local device date): ${String(today||new Date().toISOString().slice(0,10))}
Profile: ${JSON.stringify(profile).slice(0,3000)}
Current checklist: ${JSON.stringify(tasks).slice(0,3500)}\nRecent daily history (latest first): ${JSON.stringify(Array.isArray(taskHistory)?taskHistory.slice(-30):[]).slice(0,9000)}
Existing study record: ${JSON.stringify(study).slice(0,12000)}
Return ONLY valid JSON: {"reply":"student-facing Markdown","study":{"goal":null or {"title":"...","details":"...","updatedAt":"YYYY-MM-DD"},"profileSummary":"durable class schedule, travel, daily availability, constraints, strengths and weaknesses","activePlan":null or {"title":"...","details":"...","updatedAt":"YYYY-MM-DD"},"milestones":[{"title":"...","details":"...","status":"not_started|in_progress|done"}],"notes":[{"title":"...","details":"...","updatedAt":"YYYY-MM-DD"}],"dailyChecklist":[{"task":"specific actionable task","taskId":"stable-id-if-known","subject":"Biology|Chemistry|Physics|General","durationMinutes":45,"done":false,"status":"planned|completed|partially_completed|missed|postponed|cancelled|unknown","date":"YYYY-MM-DD","reason":"optional scheduling reason"}],"tests":[{"title":"test name","date":"YYYY-MM-DD","syllabus":"concise subject/topic list","status":"upcoming|done","score":"optional total score","subjectScores":{"Physics":0,"Chemistry":0,"Biology":0},"correct":0,"incorrect":0,"unanswered":0,"weakTopics":["optional chapter/topic"],"mistakes":["optional concise error pattern"],"analysisNotes":"optional evidence-based analysis"}],"syllabus":[{"subject":"...","topic":"chapter/topic","status":"not_started|in_progress|done","completedAt":"YYYY-MM-DD"}],"revisions":[{"id":"stable-id","subject":"Physics|Chemistry|Biology","topic":"...","completedAt":"YYYY-MM-DD","intervalDays":1,"dueDate":"YYYY-MM-DD","status":"scheduled|completed"}]}}. Keep lists concise. Carry forward valid records and today's task completion state unless changed. Preserve stable task IDs where possible. Use taskHistory to identify repeated missed topics and workload issues. Prioritize overdue test-critical tasks, but reschedule only a realistic subset and explain what was deferred. Never convert old missed tasks to completed. Do not include past-day tasks in today's checklist. When a test is reported, store it and its topics; when the schedule changes, regenerate today's checklist. When a syllabus topic is completed, use your judgment to decide when and how it should be revised based on recency, difficulty, test dates, previous revision outcomes, and the student's actual daily capacity. You—not fixed rules in the app—own the revision schedule. Add or update revision records only when useful, and turn the revisions that matter today into a small number of actionable dailyChecklist tasks. Avoid a large permanent revision queue; balance new classes, same-day class revision, older weak topics, upcoming tests, and unfinished work. Do not invent mock-test scores; if a score is supplied, save it in the test record and preserve subject breakdowns, correct/incorrect/unanswered counts, weak topics, mistake patterns, and analysis notes when available. Do not fabricate missing subject scores or question counts; omit unknown fields. Never claim saved changes unless returned in this JSON. Keep daily task count to a realistic maximum of 12 and each task duration between 5 and 600 minutes.`;
 const contents=[];
 const normalizedHistory=[];
 const transientFailure=/^(?:Could not connect to NEETOS\\.|The mentor service could not be reached\\.|You appear to be offline\\.|Gemini (?:request failed|is temporarily overloaded|rejected|free-tier|rate-limiting)|Could not reach the Gemini provider|The AI provider is temporarily overloaded|Network error while contacting the AI provider)/i;
 for(const m of (Array.isArray(history)?history:[]).slice(-16)){
  if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim())continue;
  if(m.role==='assistant'&&transientFailure.test(m.content.trim()))continue;
  const role=m.role==='assistant'?'model':'user';
  const content=m.content.trim().slice(0,2200);
  const previous=normalizedHistory[normalizedHistory.length-1];
  if(previous&&previous.role===role)previous.parts[0].text+='\\n\\n'+content;
  else normalizedHistory.push({role,parts:[{text:content}]});
 }
 while(normalizedHistory.length&&normalizedHistory[0].role==='model')normalizedHistory.shift();
 contents.push(...normalizedHistory.slice(-16));
 const latest=message.trim().slice(0,5000);
 const last=contents[contents.length-1];
 if(last&&last.role==='user')last.parts[0].text+='\\n\\nLatest message: '+latest;
 else contents.push({role:'user',parts:[{text:latest}]});

 try{
  const models=[process.env.GEMINI_MODEL||'gemini-3.8-flash','gemini-3.6-flash'].filter((model,index,list)=>model&&list.indexOf(model)===index);
  const body=JSON.stringify({
   systemInstruction:{parts:[{text:system}]},
   contents,
   generationConfig:{maxOutputTokens:4096,responseMimeType:'application/json',thinkingConfig:{thinkingLevel:'low'}}
  });
  const transientStatuses=[429,500,502,503,504];
  let raw='',lastStatus=0,lastDetail='No response from Gemini.',lastNetworkError=false;
  for(const model of models){
   for(let attempt=0;attempt<2;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    let r,data={};
    try{
     r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body,
      signal:controller.signal
     });
     data=await r.json().catch(()=>({}));
    }catch(e){
     lastStatus=0;
     lastNetworkError=true;
     lastDetail=e&&e.name==='AbortError'?'The Gemini request timed out.':'Could not reach the Gemini provider.';
     console.error('NEETOS Gemini transport failure model='+model+' attempt='+(attempt+1)+' kind='+(e&&e.name||'Error'));
     if(attempt===0){await new Promise(resolve=>setTimeout(resolve,350));continue;}
     break;
    }finally{clearTimeout(timer);}
    if(r.ok){
     raw=(data.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').join('\n').trim();
     if(raw)break;
     lastStatus=502;
     lastDetail='Gemini returned an empty response.';
     console.error('NEETOS Gemini empty response model='+model);
     break;
    }
    lastStatus=r.status;
    lastNetworkError=false;
    lastDetail=(data&&data.error&&data.error.message)||'Unknown provider error';
    console.error('NEETOS Gemini API error model='+model+' status='+r.status+' '+JSON.stringify(data).slice(0,700));
    if(r.status===401||r.status===403){
     return res.status(503).json({error:'Gemini rejected the configured API key or permissions. Check GEMINI_API_KEY in Vercel.'});
    }
    if(transientStatuses.includes(r.status)){
     if(attempt===0){await new Promise(resolve=>setTimeout(resolve,350));continue;}
     break;
    }
    // A model-specific 400/404 can be bypassed by the supported fallback model.
    if((r.status===400||r.status===404)&&model!==models[models.length-1])break;
    break;
   }
   if(raw)break;
  }
  if(!raw){
   if(lastStatus===429)return res.status(429).json({error:'The AI provider is rate-limiting requests. Wait briefly and retry; your saved plan was not changed.'});
   if(lastStatus===503||lastStatus===504)return res.status(503).json({error:'The AI provider is temporarily overloaded. NEETOS retried and tried its fallback model; your saved plan was not changed. Retry shortly.'});
   if(lastNetworkError)return res.status(502).json({error:lastDetail+' NEETOS tried its available models, but could not get a response. Your saved plan was not changed.'});
   if(lastStatus===404)return res.status(503).json({error:'Neither configured Gemini model is available to this API key. Check model access in Google AI Studio.'});
   return res.status(502).json({error:'Gemini request failed ('+(lastStatus||'unknown status')+'): '+String(lastDetail).slice(0,220)+'. Your saved plan was not changed.'});
  }
  let parsed;
  try{parsed=JSON.parse(raw)}catch(e){
   const cleaned=raw.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'').trim();
   const start=cleaned.indexOf('{'),end=cleaned.lastIndexOf('}');
   if(start>=0&&end>start){try{parsed=JSON.parse(cleaned.slice(start,end+1))}catch(_){}}
  }
  if(!parsed||typeof parsed.reply!=='string'||!parsed.study||typeof parsed.study!=='object'){
   console.error('NEETOS invalid JSON response',raw.slice(0,900));
   return res.status(502).json({error:'The AI returned an incomplete plan. Your saved data is unchanged; tap Send to retry.'});
  }
  return res.status(200).json({reply:parsed.reply,study:parsed.study});
 }catch(e){return res.status(502).json({error:'Network error while contacting the AI provider. Retry shortly.'});}
}