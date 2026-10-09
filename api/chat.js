export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const key=process.env.GEMINI_API_KEY;if(!key)return res.status(503).json({error:'AI service is not configured. Your message remains saved in the app.'});
 const {message,history=[],profile={},tasks=[],study={}}=req.body||{};
 if(typeof message!=='string'||!message.trim())return res.status(400).json({error:'Enter a message first.'});
 const system=`You are NEETOS, a persistent AI NEET mentor and study manager. Proactively manage the student's durable study record. Prioritize NCERT-aligned Biology, Chemistry and Physics. Be clear, structured and realistic. For each message, identify durable changes to goals, exam year, coaching/travel timings, available study hours, strengths/weaknesses, constraints, plans, milestones, completed work, test results, and preferences. Update the study record when new details are shared or a plan should change. Preserve valid existing information, correct it when the student updates it, and revise the existing active plan rather than duplicate it. Ask at most one concise follow-up when a critical detail is missing, but save what is already known. Respond in readable Markdown with headings, bullets and tables when useful. Casual doubts should not overwrite goals. Chat history is disposable; the study record is durable.
Profile: ${JSON.stringify(profile).slice(0,2500)}
Checklist: ${JSON.stringify(tasks).slice(0,2500)}
Existing study record: ${JSON.stringify(study).slice(0,10000)}
Return ONLY valid JSON shaped as {"reply":"student-facing Markdown answer","study":{"goal":null or {"title":"...","details":"...","updatedAt":"YYYY-MM-DD"},"profileSummary":"durable summary of schedule, constraints and learning needs","activePlan":null or {"title":"...","details":"...","updatedAt":"YYYY-MM-DD"},"milestones":[{"title":"...","details":"...","status":"not_started|in_progress|done"}],"notes":[{"title":"...","details":"...","updatedAt":"YYYY-MM-DD"}]}. Carry forward valid records. Keep concise and avoid duplicate notes.`;
 const contents=[];
 for(const m of (Array.isArray(history)?history:[]).slice(-16)){if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string')continue;contents.push({role:m.role==='assistant'?'model':'user',parts:[{text:m.content.slice(0,5000)}]});}
 contents.push({role:'user',parts:[{text:message.trim().slice(0,5000)}]});
 try{
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:.35,maxOutputTokens:2200,responseMimeType:'application/json'}})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const s=r.status;let msg='The AI service is temporarily unavailable.';if(s===429)msg='The AI service rate limit was reached. Wait a little and retry.';else if(s===400)msg='The AI request was rejected. Try shortening your message.';else if(s===403)msg='The AI service key or permissions need attention.';return res.status(s===429?429:502).json({error:msg,providerStatus:s});}
  const reply=(data.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').join('\n').trim();
  if(!reply)return res.status(502).json({error:'The AI returned no text. Please retry.'});
  return res.status(200).json({reply});
 }catch(e){return res.status(502).json({error:'Network error while contacting the AI provider. Retry shortly.'});}
}