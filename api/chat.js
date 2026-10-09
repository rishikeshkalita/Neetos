export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const key=process.env.GEMINI_API_KEY;if(!key)return res.status(503).json({error:'AI service is not configured. Your message remains saved in the app.'});
 const {message,history=[],profile={},tasks=[]}=req.body||{};
 if(typeof message!=='string'||!message.trim())return res.status(400).json({error:'Enter a message first.'});
 const system='You are NEETOS, a precise and encouraging mentor for India’s NEET-UG exam. Prioritize NCERT-aligned Biology, Chemistry, and Physics. Explain concepts clearly, use exam-oriented examples, correct misconceptions, and avoid inventing syllabus facts. Tailor advice to the student profile when available. For medical questions, stay educational and do not replace a clinician. Student profile: '+JSON.stringify(profile).slice(0,1500)+'; checklist: '+JSON.stringify(tasks).slice(0,2000);
 const contents=[];
 for(const m of (Array.isArray(history)?history:[]).slice(-16)){if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string')continue;contents.push({role:m.role==='assistant'?'model':'user',parts:[{text:m.content.slice(0,5000)}]});}
 contents.push({role:'user',parts:[{text:message.trim().slice(0,5000)}]});
 try{
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:.45,maxOutputTokens:1200}})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){const s=r.status;let msg='The AI service is temporarily unavailable.';if(s===429)msg='The AI service rate limit was reached. Wait a little and retry.';else if(s===400)msg='The AI request was rejected. Try shortening your message.';else if(s===403)msg='The AI service key or permissions need attention.';return res.status(s===429?429:502).json({error:msg,providerStatus:s});}
  const reply=(data.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').join('\n').trim();
  if(!reply)return res.status(502).json({error:'The AI returned no text. Please retry.'});
  return res.status(200).json({reply});
 }catch(e){return res.status(502).json({error:'Network error while contacting the AI provider. Retry shortly.'});}
}