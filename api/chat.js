export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const key=process.env.GEMINI_API_KEY;const openaiKey=process.env.OPENAI_API_KEY;if(!key&&!openaiKey){console.error('NEETOS: no AI provider key is configured');return res.status(503).json({error:'AI service is not configured on the server yet. Please try again later.'});}
 const {message,history=[],profile={},tasks=[],study={},today}=req.body||{};
 if(typeof message!=='string'||!message.trim())return res.status(400).json({error:'Enter a message first.'});
 const system=`You are NEETOS, a highly practical human-like NEET mentor and personal study manager. Minimize manual work: the student simply tells you about changed class timings, travel/errands, tests, dates, test syllabi, weak topics, scores, energy and available time. You must update the durable study record yourself and create/revise today's realistic checklist. Plan around fixed commitments and travel first, add buffers/meals/rest, prioritize the nearest test and high-value revision, avoid impossible schedules, and explain tradeoffs kindly. Do not ask the student to copy information into forms. If information is missing, make a clearly labeled reasonable provisional plan and ask at most one useful question. Preserve existing information; changed class schedules or new tests update existing records, not duplicates. Record test dates and syllabus, break syllabus into subject topics, track statuses, milestones, results and weak areas. Every response must be readable Markdown with headings and compact checklists/tables where useful. A daily checklist must be returned whenever the student gives daily commitments or asks for planning. The dashboard is the durable source of truth; chat transcript is disposable.
Today (local device date): ${String(today||new Date().toISOString().slice(0,10))}
Profile: ${JSON.stringify(profile).slice(0,3000)}
Existing task checklist: ${JSON.stringify(tasks).slice(0,2500)}
Existing study record: ${JSON.stringify(study).slice(0,12000)}
Return ONLY valid JSON: {"reply":"student-facing Markdown","study":{"goal":null or {"title":"...","details":"...","updatedAt":"YYYY-MM-DD"},"profileSummary":"durable class schedule, travel, daily availability, constraints, strengths and weaknesses","activePlan":null or {"title":"...","details":"...","updatedAt":"YYYY-MM-DD"},"milestones":[{"title":"...","details":"...","status":"not_started|in_progress|done"}],"notes":[{"title":"...","details":"...","updatedAt":"YYYY-MM-DD"}],"dailyChecklist":[{"task":"specific actionable task","subject":"Biology|Chemistry|Physics|General","durationMinutes":45,"done":false,"date":"YYYY-MM-DD"}],"tests":[{"title":"test name","date":"YYYY-MM-DD","syllabus":"concise subject/topic list","status":"upcoming|done","score":"optional result"}],"syllabus":[{"subject":"...","topic":"chapter/topic","status":"not_started|in_progress|done"}]}}. Keep lists concise. Carry forward valid records and today's task completion state unless changed. When a test is reported, store it and its topics; when the schedule changes, regenerate today's checklist. Never claim saved changes unless returned in this JSON.`;
 const contents=[];
 for(const m of (Array.isArray(history)?history:[]).slice(-16)){if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string')continue;contents.push({role:m.role==='assistant'?'model':'user',parts:[{text:m.content.slice(0,5000)}]});}
 contents.push({role:'user',parts:[{text:message.trim().slice(0,5000)}]});
 try{
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:.35,maxOutputTokens:2200,responseMimeType:'application/json'}})});
  const data=await r.json().catch(()=>({}));
  let raw='';
  if(r.ok)raw=(data.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').join('\n').trim();
  else console.error('NEETOS Gemini API error',r.status,JSON.stringify(data).slice(0,1200));
  if(!raw&&openaiKey){
   try{
    const fallback=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+openaiKey},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({history:(Array.isArray(history)?history:[]).slice(-12),message:message.trim().slice(0,5000)})}],response_format:{type:'json_object'},temperature:.35,max_tokens:2600})});
    const fd=await fallback.json().catch(()=>({}));
    if(fallback.ok)raw=fd.choices?.[0]?.message?.content||'';
    else console.error('NEETOS OpenAI fallback error',fallback.status,JSON.stringify(fd).slice(0,1200));
   }catch(e){console.error('NEETOS OpenAI fallback network error',String(e).slice(0,500));}
  }
  if(!raw)return res.status(502).json({error:'NEETOS could not reach an available AI provider. Please retry in a moment.'});
  let parsed;
  try{parsed=JSON.parse(raw)}catch(e){return res.status(502).json({error:'The AI response could not be parsed safely. Please retry.'});}
  if(!parsed||typeof parsed.reply!=='string'||!parsed.study||typeof parsed.study!=='object')return res.status(502).json({error:'The AI response was incomplete. Please retry.'});
  return res.status(200).json({reply:parsed.reply,study:parsed.study});
 }catch(e){return res.status(502).json({error:'Network error while contacting the AI provider. Retry shortly.'});}
}