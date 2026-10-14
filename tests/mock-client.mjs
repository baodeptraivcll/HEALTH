import {defaultItems,localDate} from '../src/lib/model.ts';
export function mockClient() {
  const user={id:'qa-user',email:'qa@example.invalid',user_metadata:{full_name:'Kiểm tra giao diện'}};
  const tables={health_items:defaultItems.map(item=>({...item,user_id:user.id})),health_activities:[],health_habit_checks:[]};
  const calls=[];
  function query(table) {
    let action='select',values=null,filters=[];
    const q={
      select(){return q},eq(key,value){filters.push(row=>row[key]===value);return q},gte(key,value){filters.push(row=>row[key]>=value);return q},lte(key,value){filters.push(row=>row[key]<=value);return q},
      insert(value){action='insert';values=value;return q},update(value){action='update';values=value;return q},delete(){action='delete';return q},upsert(value){action='upsert';values=value;return q},
      then(resolve,reject){return Promise.resolve().then(()=>{
        calls.push({table,action,values});const match=row=>filters.every(filter=>filter(row));
        if(action==='insert')tables[table].push({...values,id:values.id||crypto.randomUUID()});
        if(action==='update')tables[table].filter(match).forEach(row=>Object.assign(row,values));
        if(action==='delete')tables[table]=tables[table].filter(row=>!match(row));
        if(action==='upsert'){const current=tables[table].find(row=>row.user_id===values.user_id&&row.date===values.date&&row.habit===values.habit);if(current)Object.assign(current,values);else tables[table].push({...values})}
        return {data:structuredClone(tables[table].filter(match)),error:null};
      }).then(resolve,reject)},
    };return q;
  }
  return {tables,calls,from:query,rpc:async()=>({error:null}),auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:{user}},error:null}),signOut:async()=>({error:null})},addEntry(category='food'){tables.health_activities.push({id:crypto.randomUUID(),user_id:user.id,date:localDate(),time:'07:00',category,title:'Ăn 2 quả trứng',detail:'Bữa sáng',quantity:2,unit:'quả',minutes:0,sleep_start:null,sleep_end:null,icon:''})}};
}
