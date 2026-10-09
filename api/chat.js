export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const key=process.env.GEMINI_API_KEY;if(!key){console.error('NEETOS: GEMINI_API_KEY is missing');return res.status(503).json({error:'The free Gemini AI key is not configured. Add a valid Gemini API key in Vercel to enable the mentor.'});}
 const {message,history=[],profile={},tasks=[],taskHistory=[],study={},today}=req.body||{};
 if(typeof message!=='string'||!message.trim())return res.status(400).json({error:'Enter a message first.'});
 if(message.length>5000)return res.status(413).json({error:'Message is too long. Keep it under 5,000 characters.'});
 if(!Array.isArray(history)||history.length>30||!Array.isArray(tasks)||tasks.length>100||!Array.isArray(taskHistory)||taskHistory.length>180)return res.status(400).json({error:'Invalid or oversized study context. Refresh and retry.'});
 const system=`You are NEETOS, a highly practical human-like NEET mentor and personal study manager. Minimize manual work: the student simply tells you about changed class timings, travel/errands, tests, dates, test syllabi, weak topics, scores, energy and available time. You must update the durable study record yourself and create/revise today's realistic checklist. Plan around fixed commitments and travel first, add buffers/meals/rest, prioritize the nearest test and high-value revision, avoid impossible schedules, and explain tradeoffs kindly. Do not ask the student to copy information into forms. If information is missing, make a clearly labeled reasonable provisional plan and ask at most one useful question. Preserve existing information; changed class schedules or new tests update existing records, not duplicates. Record test dates and syllabus, break syllabus into subject topics, track statuses, milestones, results and weak areas. Every response must be readable Markdown with headings and compact checklists/tables where useful. A daily checklist must be returned whenever the student gives daily commitments or asks for planning. The structured daily task history is durable memory; chat transcript is only supporting context. Before planning, inspect recent daily history, unfinished and missed tasks, and upcoming tests. Do not treat a task as completed unless confirmed. Do not silently forget missed tasks: preserve their history and selectively reschedule important ones, without dumping the entire backlog into today. If a past task outcome is unknown, keep it unknown rather than claiming it was done or missed with certainty. Keep task identity and completion state stable when regenerating a plan.
Today (local device date): ${String(today||new Date().toISOString().slice(0,10))}
Profile: ${JSON.stringify(profile).slice(0,3000)}
Current checklist: ${JSON.stringify(tasks).slice(0,3500)}\nRecent daily history (latest first): ${JSON.stringify(Array.isArray(taskHistory)?taskHistory.slice(-30):[]).slice(0,9000)}
Existing study record: ${JSON.stringify(study).slice(0,12000)}
Return ONLY valid JSON: {"reply":"student-facing Markdown","study":{"goal":null or {"title":"...","details":"...","updatedAt":"YYYY-MM-DD"},"profileSummary":"durable class schedule, travel, daily availability, constraints, strengths and weaknesses","activePlan":null or {"title":"...","details":"...","updatedAt":"YYYY-MM-DD"},"milestones":[{"title":"...","details":"...","status":"not_started|in_progress|done"}],"notes":[{"title":"...","details":"...","updatedAt":"YYYY-MM-DD"}],"dailyChecklist":[{"task":"specific actionable task","taskId":"stable-id-if-known","subject":"Biology|Chemistry|Physics|General","durationMinutes":45,"done":false,"status":"planned|completed|partially_completed|missed|postponed|cancelled|unknown","date":"YYYY-MM-DD","reason":"optional scheduling reason"}],"tests":[{"title":"test name","date":"YYYY-MM-DD","syllabus":"concise subject/topic list","status":"upcoming|done","score":"optional result"}],"syllabus":[{"subject":"...","topic":"chapter/topic","status":"not_started|in_progress|done","completedAt":"YYYY-MM-DD"}],"revisions":[{"id":"stable-id","subject":"Physics|Chemistry|Biology","topic":"...","completedAt":"YYYY-MM-DD","intervalDays":1,"dueDate":"YYYY-MM-DD","status":"scheduled|completed"}]}}. Keep lists concise. Carry forward valid records and today's task completion state unless changed. Preserve stable task IDs where possible. Use taskHistory to identify repeated missed topics and workload issues. Prioritize overdue test-critical tasks, but reschedule only a realistic subset and explain what was deferred. Never convert old missed tasks to completed. Do not include past-day tasks in today's checklist. When a test is reported, store it and its topics; when the schedule changes, regenerate today's checklist. When a syllabus topic first becomes done, include completedAt if known; the app independently creates spaced reviews at 1, 3, 7, 14 and 30 days. Do not invent mock-test scores; if a score is supplied, save it in the test record and preserve subject breakdowns and error notes when available. Never claim saved changes unless returned in this JSON. Keep daily task count to a realistic maximum of 12 and each task duration between 5 and 600 minutes.`;
 const contents=[];
 for(const m of (Array.isArray(history)?history:[]).slice(-16)){if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string')continue;contents.push({role:m.role==='assistant'?'model':'user',parts:[{text:m.content.slice(0,5000)}]});}
 contents.push({role:'user',parts:[{text:message.trim().slice(0,5000)}]});
 try{
  const endpoint='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key='+encodeURIComponent(key);
  const body=JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:.35,maxOutputTokens:2200,responseMimeType:'application/json'}});
  let r,data={};
  for(let attempt=0;attempt<3;attempt++){
   try{r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body});data=await r.json().catch(()=>({}));}
   catch(e){if(attempt<2){await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));continue;}throw e;}
   if(r.ok||![429,500,502,503,504].includes(r.status)||attempt===2)break;
   await new Promise(resolve=>setTimeout(resolve,650*(attempt+1)));
  }
  let raw='';
  if(r&&r.ok)raw=(data.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').join('\\n').trim();
  else console.error('NEETOS Gemini API error',r&&r.status,JSON.stringify(data).slice(0,1200));
  if(!raw){
   const status=(r&&r.status)||502,detail=(data&&data.error&&data.error.message)||'Unknown provider error';
   if(status===429)return res.status(429).json({error:'Gemini free-tier rate limit reached. Wait a little and retry; your saved plan was not changed.'});
   if(status===503||status===504)return res.status(503).json({error:'Gemini is temporarily overloaded after automatic retries. Your saved plan was not changed; retry in a minute.'});
   if(status===401||status===403)return res.status(503).json({error:'Gemini rejected the API key or its permissions. Check GEMINI_API_KEY in Vercel.'});
   return res.status(502).json({error:'Gemini request failed ('+status+'): '+String(detail).slice(0,220)});
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