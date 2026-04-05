const {PrismaClient} = require('./src/generated/prisma/client');
const db = new PrismaClient();
async function main(){
  const parents = await db.parent.count();
  const players = await db.player.count();
  const uniforms = await db.uniformOrder.count().catch(e=> 'ERROR: '+e.message);
  const users = await db.user.count();
  const leaderboard = await db.player.findMany({
    select:{id:true,xp:true,level:true,user:{select:{name:true}}},
    orderBy:{xp:'desc'},
    take:10
  });
  console.log(JSON.stringify({parents,players,uniforms,users,leaderboard},null,2));
}
main().catch(e=>console.error('FATAL:',e.message)).finally(()=>db.$disconnect());
