import ParticipantLayout from '../../components/layout/ParticipantLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useTeams } from '../../hooks/useTeams';
import { useParticipants } from '../../hooks/useParticipants';
import { CheckCircle2, Clock } from 'lucide-react';

const MY_TEAM_ID = 't1';

function Initials({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#80766b]/10 flex items-center justify-center text-[#80766b] font-bold text-sm shrink-0">
      {name.slice(0, 1)}
    </div>
  );
}

export default function ParticipantDashboard() {
  const teams = useTeams();
  const participants = useParticipants();

  const myTeam = teams.find((t) => t.id === MY_TEAM_ID);
  const myMembers = myTeam
    ? participants.filter((p) => myTeam.members.includes(p.id))
    : [];

  if (!myTeam) {
    return (
      <ParticipantLayout>
        <p className="text-sm text-gray-400 text-center py-10">팀 정보를 불러올 수 없습니다.</p>
      </ParticipantLayout>
    );
  }

  const submitted = myTeam.submitStatus === 'submitted';

  return (
    <ParticipantLayout>
      {/* ── 팀 헤더 카드 ── */}
      <Card className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{myTeam.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">팀원 {myTeam.members.length}명</p>
          </div>
          <Badge status={myTeam.submitStatus} />
        </div>
      </Card>

      {/* ── 팀원 목록 ── */}
      <Card title="팀원 목록" className="mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {myMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
            >
              <Initials name={member.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{member.name}</p>
                <p className="text-xs text-gray-400 truncate">{member.email}</p>
              </div>
              <Badge status={member.status} />
            </div>
          ))}
        </div>
      </Card>

      {/* ── 팀 아이디어 ── */}
      <Card title="팀 아이디어" className="mb-5">
        <p className="text-sm text-gray-600 leading-relaxed">{myTeam.idea}</p>
      </Card>

      {/* ── 제출 현황 요약 ── */}
      <Card title="제출 현황">
        <div
          className={`flex items-center gap-4 p-4 rounded-xl border ${
            submitted
              ? 'bg-green-50 border-green-100'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          {submitted ? (
            <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
          ) : (
            <Clock className="w-8 h-8 text-gray-400 shrink-0" />
          )}
          <div>
            <p
              className={`font-semibold ${
                submitted ? 'text-green-800' : 'text-gray-600'
              }`}
            >
              {submitted ? '제출 완료' : '아직 제출하지 않았습니다'}
            </p>
            <p
              className={`text-xs mt-0.5 ${
                submitted ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {submitted
                ? '심사위원회에서 검토 중입니다.'
                : '제출하기 메뉴에서 결과물을 제출해주세요.'}
            </p>
          </div>
        </div>
      </Card>
    </ParticipantLayout>
  );
}
