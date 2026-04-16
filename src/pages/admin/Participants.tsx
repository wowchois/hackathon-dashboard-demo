import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileSpreadsheet,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Trash2,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import { useParticipants } from '../../hooks/useParticipants';
import { useTeams } from '../../hooks/useTeams';
import {
  addTeam,
  autoMatch,
  createParticipantWithAuth,
  deleteParticipant,
  deleteTeam,
  toggleTeamLock,
  updateParticipant,
  updateTeam,
} from '../../data/hackathonStore';
import type { AutoMatchOptions, Team } from '../../data/hackathonStore';
import { apiResetParticipantPassword } from '../../api/participants';
import type { Participant } from '../../data/mockData';

type Tab = 'participants' | 'teams';

interface ParticipantFormState {
  name: string;
  email: string;
  team: string;
  department: string;
  position: string;
  status: 'approved' | 'pending' | 'rejected';
}

interface TeamFormState {
  name: string;
  idea: string;
}

interface TeamAssignmentState {
  search: string;
  selectedParticipantIds: string[];
  checkedCandidateIds: string[];
}

interface ToastState {
  visible: boolean;
  message: string;
}

interface ParticipantDraftRow {
  key: string;
  id?: string;
  mode: 'new' | 'edit';
  form: ParticipantFormState;
  errors: Partial<Record<keyof ParticipantFormState, string>>;
  teamLocked: boolean;
}

const EMPTY_PARTICIPANT_FORM: ParticipantFormState = {
  name: '',
  email: '',
  team: '',
  department: '',
  position: '',
  status: 'pending',
};

const EMPTY_TEAM_FORM: TeamFormState = {
  name: '',
  idea: '',
};

const EMPTY_TEAM_ASSIGNMENT: TeamAssignmentState = {
  search: '',
  selectedParticipantIds: [],
  checkedCandidateIds: [],
};

const MAX_NEW_ROWS = 50;

function Toast({ toast, onHide }: { toast: ToastState; onHide: () => void }) {
  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(onHide, 3000);
    return () => clearTimeout(timer);
  }, [toast.visible, onHide]);

  if (!toast.visible) return null;

  return (
    <div
      className="fixed bottom-6 z-[100] left-1/2 -translate-x-1/2 lg:left-[calc(50%+120px)] rounded-xl bg-gray-800 px-4 py-3 text-sm font-medium text-white shadow-lg"
    >
      {toast.message}
    </div>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function modalInputClass(hasError: boolean) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-300 focus:ring-red-200'
      : 'border-gray-200 focus:ring-[#80766b]/30'
  }`;
}

function tableInputClass(hasError: boolean) {
  return `w-full rounded-lg border bg-white px-2.5 py-2 text-sm transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-300 focus:ring-red-200'
      : 'border-gray-200 focus:ring-[#80766b]/30'
  }`;
}

function createDraftRow(index: number): ParticipantDraftRow {
  return {
    key: `new-${index}`,
    mode: 'new',
    form: { ...EMPTY_PARTICIPANT_FORM },
    errors: {},
    teamLocked: false,
  };
}

async function parseExcelFile(
  file: File,
  startIndex: number,
  limit: number
): Promise<{ rows: ParticipantDraftRow[]; truncated: number }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const all: ParticipantDraftRow[] = json.map((row, i) => ({
    key: `import-${startIndex + i}`,
    mode: 'new',
    form: {
      name: String(row['이름'] ?? '').trim(),
      email: String(row['이메일'] ?? '').trim(),
      department: String(row['부서'] ?? '').trim(),
      position: String(row['직급'] ?? '').trim(),
      team: '',
      status: 'pending',
    },
    errors: {},
    teamLocked: false,
  }));

  const truncated = Math.max(0, all.length - limit);
  return { rows: all.slice(0, limit), truncated };
}

function validateParticipantDraft(
  draft: ParticipantDraftRow,
  teams: Team[]
): Partial<Record<keyof ParticipantFormState, string>> {
  const nextErrors: Partial<Record<keyof ParticipantFormState, string>> = {};

  if (!draft.form.name.trim()) nextErrors.name = '이름을 입력해 주세요.';
  if (!draft.form.email.trim()) nextErrors.email = '이메일을 입력해 주세요.';

  const selectedTeam = teams.find((team) => team.id === draft.form.team);
  if (selectedTeam?.locked) {
    nextErrors.team = '잠금된 팀에는 배정할 수 없습니다.';
  }

  return nextErrors;
}

function statusLabel(status: ParticipantFormState['status']) {
  switch (status) {
    case 'approved':
      return '승인';
    case 'rejected':
      return '거절';
    default:
      return '대기';
  }
}

function getNextTeamLabel(teams: Team[]) {
  const nextNumber =
    teams.reduce((max, team) => {
      const match = team.name.trim().match(/^(\d+)조$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  return `${nextNumber}조`;
}

function mergeTeams(baseTeams: Team[], optimisticTeams: Team[]) {
  const merged = new Map(baseTeams.map((team) => [team.id, team]));
  for (const team of optimisticTeams) {
    merged.set(team.id, team);
  }
  return Array.from(merged.values());
}

function mergeParticipants(baseParticipants: Participant[], optimisticParticipants: Participant[]) {
  const merged = new Map(baseParticipants.map((participant) => [participant.id, participant]));
  for (const participant of optimisticParticipants) {
    merged.set(participant.id, participant);
  }
  return Array.from(merged.values());
}

export default function Participants() {
  const participants = useParticipants();
  const teams = useTeams();

  const [tab, setTab] = useState<Tab>('participants');
  const [search, setSearch] = useState('');
  const [newRows, setNewRows] = useState<ParticipantDraftRow[]>([]);
  const [editRows, setEditRows] = useState<Record<string, ParticipantDraftRow>>({});
  const [optimisticParticipants, setOptimisticParticipants] = useState<Participant[]>([]);
  const [deletedParticipantIds, setDeletedParticipantIds] = useState<Set<string>>(new Set());
  const [optimisticTeams, setOptimisticTeams] = useState<Team[]>([]);
  const [draftCounter, setDraftCounter] = useState(0);
  const [savingParticipants, setSavingParticipants] = useState(false);
  const [tModal, setTModal] = useState<
    { mode: 'add' } | { mode: 'edit'; id: string } | null
  >(null);
  const [tForm, setTForm] = useState<TeamFormState>(EMPTY_TEAM_FORM);
  const [tErrors, setTErrors] = useState<Partial<TeamFormState>>({});
  const [tAssignment, setTAssignment] = useState<TeamAssignmentState>(EMPTY_TEAM_ASSIGNMENT);
  const [savingTeam, setSavingTeam] = useState(false);
  const [matchOptions, setMatchOptions] = useState<AutoMatchOptions>({
    teamSize: 4,
    spreadDepartment: true,
    spreadPosition: true,
    limitLeader: true,
  });
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const displayTeams = useMemo(() => mergeTeams(teams, optimisticTeams), [teams, optimisticTeams]);

  const displayParticipants = useMemo(
    () =>
      mergeParticipants(participants, optimisticParticipants).filter(
        (p) => !deletedParticipantIds.has(p.id)
      ),
    [participants, optimisticParticipants, deletedParticipantIds]
  );

  const filteredParticipants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return displayParticipants.filter((participant) => {
      if (!query) return true;
      return (
        participant.name.toLowerCase().includes(query) ||
        participant.email.toLowerCase().includes(query) ||
        participant.department.toLowerCase().includes(query) ||
        participant.position.toLowerCase().includes(query)
      );
    });
  }, [displayParticipants, search]);

  const teamAddCandidates = useMemo(
    () =>
      displayParticipants.filter(
        (participant) =>
          participant.status === 'approved' &&
          participant.team === '' &&
          !tAssignment.selectedParticipantIds.includes(participant.id)
      ),
    [displayParticipants, tAssignment.selectedParticipantIds]
  );

  const filteredTeamAddCandidates = useMemo(() => {
    const query = tAssignment.search.trim().toLowerCase();
    return teamAddCandidates.filter((participant) => {
      if (!query) return true;
      return participant.name.toLowerCase().includes(query);
    });
  }, [teamAddCandidates, tAssignment.search]);

  const selectedTeamParticipants = useMemo(
    () =>
      tAssignment.selectedParticipantIds
        .map((id) => displayParticipants.find((participant) => participant.id === id))
        .filter((participant): participant is Participant => !!participant),
    [displayParticipants, tAssignment.selectedParticipantIds]
  );

  const participantRowKeys = useMemo(
    () => new Set(filteredParticipants.map((participant) => participant.id)),
    [filteredParticipants]
  );

  const visibleEditRows = useMemo(
    () =>
      Object.values(editRows).filter((draft) => draft.id && participantRowKeys.has(draft.id)),
    [editRows, participantRowKeys]
  );

  const openDraftCount = newRows.length + Object.keys(editRows).length;
  const teamName = (teamId: string) =>
    displayTeams.find((team) => team.id === teamId)?.name ?? (teamId ? '(알 수 없는 팀)' : '-');

  const isInLockedTeam = (participant: Participant) => {
    const team = displayTeams.find((item) => item.id === participant.team);
    return !!team?.locked;
  };

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  const xlsxInputRef = useRef<HTMLInputElement>(null);

  const addParticipantRow = () => {
    if (newRows.length >= MAX_NEW_ROWS) return;
    const nextIndex = draftCounter + 1;
    setDraftCounter(nextIndex);
    setNewRows((prev) => [...prev, createDraftRow(nextIndex)]);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (xlsxInputRef.current) xlsxInputRef.current.value = '';
    if (!file) return;

    const remaining = MAX_NEW_ROWS - newRows.length;
    if (remaining <= 0) {
      setToast({ visible: true, message: `신규 행이 최대(${MAX_NEW_ROWS}개)입니다.` });
      return;
    }

    try {
      const { rows, truncated } = await parseExcelFile(file, draftCounter + 1, remaining);
      if (rows.length === 0) {
        setToast({ visible: true, message: '등록할 데이터가 없습니다. 엑셀 형식을 확인해 주세요.' });
        return;
      }
      setDraftCounter((prev) => prev + rows.length);
      setNewRows((prev) => [...prev, ...rows]);
      if (truncated > 0) {
        setToast({
          visible: true,
          message: `${rows.length}명 추가됨. ${truncated}명은 최대 행 수(${MAX_NEW_ROWS}개)를 초과하여 제외됐습니다.`,
        });
      } else {
        setToast({ visible: true, message: `${rows.length}명이 드래프트로 추가됐습니다. 내용 확인 후 저장해 주세요.` });
      }
    } catch {
      setToast({ visible: true, message: '엑셀 파일을 읽는 데 실패했습니다.' });
    }
  };

  const startEditParticipant = (participant: Participant) => {
    setEditRows((prev) => {
      if (prev[participant.id]) return prev;
      return {
        ...prev,
        [participant.id]: {
          key: participant.id,
          id: participant.id,
          mode: 'edit',
          form: {
            name: participant.name,
            email: participant.email,
            team: participant.team,
            department: participant.department,
            position: participant.position,
            status: participant.status,
          },
          errors: {},
          teamLocked: isInLockedTeam(participant),
        },
      };
    });
  };

  const updateDraftField = (
    key: string,
    field: keyof ParticipantFormState,
    value: string
  ) => {
    setNewRows((prev) =>
      prev.map((draft) =>
        draft.key === key
          ? {
              ...draft,
              form: { ...draft.form, [field]: value },
              errors: draft.errors[field]
                ? { ...draft.errors, [field]: undefined }
                : draft.errors,
            }
          : draft
      )
    );

    setEditRows((prev) => {
      const draft = prev[key];
      if (!draft) return prev;
      return {
        ...prev,
        [key]: {
          ...draft,
          form: { ...draft.form, [field]: value },
          errors: draft.errors[field]
            ? { ...draft.errors, [field]: undefined }
            : draft.errors,
        },
      };
    });
  };



  const setDraftErrors = (
    key: string,
    errors: Partial<Record<keyof ParticipantFormState, string>>
  ) => {
    setNewRows((prev) =>
      prev.map((draft) => (draft.key === key ? { ...draft, errors } : draft))
    );
    setEditRows((prev) =>
      prev[key]
        ? {
            ...prev,
            [key]: { ...prev[key], errors },
          }
        : prev
    );
  };

  const cancelDraft = (key: string) => {
    setNewRows((prev) => prev.filter((draft) => draft.key !== key));
    setEditRows((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSaveParticipants = async () => {
    const drafts = [...newRows, ...Object.values(editRows)];
    if (drafts.length === 0) return;

    let hasValidationError = false;
    for (const draft of drafts) {
      const errors = validateParticipantDraft(draft, teams);
      setDraftErrors(draft.key, errors);
      if (Object.keys(errors).length > 0) hasValidationError = true;
    }


    if (hasValidationError) {
      setToast({ visible: true, message: '필수 항목과 팀 배정 상태를 확인해 주세요.' });
      return;
    }

    setSavingParticipants(true);
    const failedKeys = new Set<string>();
    const firstError: string[] = [];

    for (const draft of drafts) {
      const payload = {
        name: draft.form.name.trim(),
        email: draft.form.email.trim(),
        team: draft.form.team,
        department: draft.form.department.trim(),
        position: draft.form.position.trim(),
        status: draft.form.status,
      };

      try {
        if (draft.mode === 'new') {
            const createdParticipant = await createParticipantWithAuth(payload);
            setOptimisticParticipants((prev) => [...prev, createdParticipant]);
        } else if (draft.id) {
          const original = displayParticipants.find((p) => p.id === draft.id);
          await updateParticipant(draft.id, payload, original?.userId);
          if (original) {
            const updated: Participant = { ...original, ...payload };
            setOptimisticParticipants((prev) => {
              const exists = prev.some((p) => p.id === draft.id);
              return exists
                ? prev.map((p) => (p.id === draft.id ? updated : p))
                : [...prev, updated];
            });
          }
        }
      } catch (e: unknown) {
        failedKeys.add(draft.key);
        if (firstError.length === 0 && e instanceof Error) firstError.push(e.message);
      }
    }

    setSavingParticipants(false);

    if (failedKeys.size === 0) {
      setNewRows([]);
      setEditRows({});
      setToast({ visible: true, message: '참가자 변경사항을 저장했습니다.' });
      return;
    }

    setNewRows((prev) => prev.filter((draft) => failedKeys.has(draft.key)));
    setEditRows((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([key]) => failedKeys.has(key)))
    );
    const errDetail = firstError.length > 0 ? ` (${firstError[0]})` : '';
    setToast({
      visible: true,
      message: `일부 행 저장에 실패했습니다.${errDetail}`,
    });
  };

  const handleDeleteParticipant = (id: string) => {
    const participant = displayParticipants.find((item) => item.id === id);
    const team = displayTeams.find((item) => item.id === participant?.team);
    if (team?.locked) {
      setToast({ visible: true, message: '잠금된 팀 소속 참가자는 삭제할 수 없습니다.' });
      return;
    }

    setConfirmDialog({
      message: `'${participant?.name ?? '참가자'}'를 삭제하시겠습니까?`,
      onConfirm: async () => {
        try {
          await deleteParticipant(id, participant?.userId);
          cancelDraft(id);
          setOptimisticParticipants((prev) => prev.filter((p) => p.id !== id));
          setDeletedParticipantIds((prev) => new Set([...prev, id]));
        } catch {
          setToast({ visible: true, message: '참가자 삭제에 실패했습니다.' });
        }
      },
    });
  };

  const handleResetPassword = (id: string) => {
    const participant = displayParticipants.find((p) => p.id === id);
    if (!participant?.userId) {
      setToast({ visible: true, message: '연결된 계정이 없어 비밀번호를 초기화할 수 없습니다.' });
      return;
    }
    setConfirmDialog({
      message: `'${participant.name}'의 비밀번호를 초기화 하시겠습니까?`,
      confirmLabel: '초기화',
      onConfirm: async () => {
        try {
          await apiResetParticipantPassword(participant.userId!);
          setToast({ visible: true, message: `'${participant.name}'의 비밀번호가 초기화됐습니다.` });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : '';
          setToast({ visible: true, message: `비밀번호 초기화에 실패했습니다.${msg ? ` (${msg})` : ''}` });
        }
      },
    });
  };

  const openTAdd = () => {
    setTForm({ name: getNextTeamLabel(displayTeams), idea: '' });
    setTErrors({});
    setTAssignment(EMPTY_TEAM_ASSIGNMENT);
    setTModal({ mode: 'add' });
  };

  const openTEdit = (teamId: string) => {
    const team = displayTeams.find((item) => item.id === teamId);
    if (!team) return;
    setTForm({ name: team.name, idea: team.idea });
    setTErrors({});
    setTAssignment({
      search: '',
      selectedParticipantIds: displayParticipants
        .filter((participant) => participant.team === teamId)
        .map((participant) => participant.id),
      checkedCandidateIds: [],
    });
    setTModal({ mode: 'edit', id: teamId });
  };

  const closeTModal = () => {
    setTModal(null);
    setSavingTeam(false);
  };

  const toggleCandidateChecked = (participantId: string) => {
    setTAssignment((prev) => ({
      ...prev,
      checkedCandidateIds: prev.checkedCandidateIds.includes(participantId)
        ? prev.checkedCandidateIds.filter((id) => id !== participantId)
        : [...prev.checkedCandidateIds, participantId],
    }));
  };

  const toggleAllCandidatesChecked = () => {
    const candidateIds = filteredTeamAddCandidates.map((participant) => participant.id);
    const isAllChecked =
      candidateIds.length > 0 &&
      candidateIds.every((id) => tAssignment.checkedCandidateIds.includes(id));

    setTAssignment((prev) => ({
      ...prev,
      checkedCandidateIds: isAllChecked
        ? prev.checkedCandidateIds.filter((id) => !candidateIds.includes(id))
        : [...new Set([...prev.checkedCandidateIds, ...candidateIds])],
    }));
  };

  const moveCheckedCandidatesToSelected = () => {
    setTAssignment((prev) => ({
      ...prev,
      selectedParticipantIds: [...new Set([...prev.selectedParticipantIds, ...prev.checkedCandidateIds])],
      checkedCandidateIds: [],
    }));
  };

  const removeSelectedParticipant = (participantId: string) => {
    setTAssignment((prev) => ({
      ...prev,
      selectedParticipantIds: prev.selectedParticipantIds.filter((id) => id !== participantId),
      checkedCandidateIds: prev.checkedCandidateIds.filter((id) => id !== participantId),
    }));
  };

  const validateTeam = () => {
    const next: Partial<TeamFormState> = {};
    if (!tForm.name.trim()) next.name = '팀 이름을 입력해 주세요.';
    setTErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleTeamSubmit = async () => {
    if (!validateTeam()) return;

    const editingTeam =
      tModal?.mode === 'edit' ? displayTeams.find((team) => team.id === tModal.id) : null;
    if (editingTeam?.locked) {
      setToast({ visible: true, message: '잠금된 팀은 수정할 수 없습니다.' });
      closeTModal();
      return;
    }

    setSavingTeam(true);

    try {
      if (tModal?.mode === 'add') {
        const createdTeam = await addTeam({ name: tForm.name.trim(), idea: tForm.idea.trim() });
        const assignmentResults = await Promise.allSettled(
          tAssignment.selectedParticipantIds.map((participantId) =>
            updateParticipant(participantId, { team: createdTeam.id })
          )
        );
        const failedAssignments = assignmentResults.filter(
          (result) => result.status === 'rejected'
        ).length;

        if (failedAssignments > 0) {
          setToast({
            visible: true,
            message: `팀은 생성되었지만 참가자 ${failedAssignments}명 배정에 실패했습니다.`,
          });
        } else {
          setToast({
            visible: true,
            message: `팀과 참가자 ${tAssignment.selectedParticipantIds.length}명 배정을 완료했습니다.`,
          });
        }
        setOptimisticTeams((prev) => [
          ...prev.filter((team) => team.id !== createdTeam.id),
          {
            id: createdTeam.id,
            name: createdTeam.name,
            idea: createdTeam.idea ?? '',
            submitStatus: createdTeam.submit_status ?? 'not-submitted',
            score: null,
            locked: createdTeam.locked ?? false,
            members: [...tAssignment.selectedParticipantIds],
          },
        ]);
        setOptimisticParticipants((prev) => {
          // prev에 없는 참가자(base 데이터에만 있는)도 업데이트해야 하므로
          // displayParticipants 기준으로 Map을 구성한 뒤 덮어씀
          const updated = new Map(prev.map((p) => [p.id, p]));
          for (const id of tAssignment.selectedParticipantIds) {
            const base = displayParticipants.find((p) => p.id === id);
            if (base) updated.set(id, { ...base, team: createdTeam.id });
          }
          return Array.from(updated.values());
        });
      } else if (tModal?.mode === 'edit') {
        const previousMemberIds = displayParticipants
          .filter((participant) => participant.team === tModal.id)
          .map((participant) => participant.id);
        const nextMemberIds = tAssignment.selectedParticipantIds;
        const toAssign = nextMemberIds.filter((id) => !previousMemberIds.includes(id));
        const toRemove = previousMemberIds.filter((id) => !nextMemberIds.includes(id));

        await updateTeam(tModal.id, {
          name: tForm.name.trim(),
          idea: tForm.idea.trim(),
        });
        const assignmentResults = await Promise.allSettled([
          ...toAssign.map((participantId) => updateParticipant(participantId, { team: tModal.id })),
          ...toRemove.map((participantId) => updateParticipant(participantId, { team: '' })),
        ]);
        const failedAssignments = assignmentResults.filter(
          (result) => result.status === 'rejected'
        ).length;

        setOptimisticTeams((prev) => [
          ...prev.filter((team) => team.id !== tModal.id),
          {
            id: tModal.id,
            name: tForm.name.trim(),
            idea: tForm.idea.trim(),
            submitStatus: editingTeam?.submitStatus ?? 'not-submitted',
            score: editingTeam?.score ?? null,
            locked: editingTeam?.locked ?? false,
            members: [...nextMemberIds],
          },
        ]);
        setOptimisticParticipants((prev) =>
          prev.map((participant) => {
            if (toAssign.includes(participant.id)) return { ...participant, team: tModal.id };
            if (toRemove.includes(participant.id)) return { ...participant, team: '' };
            return participant;
          })
        );

        setToast({
          visible: true,
          message:
            failedAssignments > 0
              ? `팀 정보는 저장되었지만 참가자 ${failedAssignments}명 반영에 실패했습니다.`
              : '팀 정보를 저장했습니다.',
        });
      }
      closeTModal();
    } catch {
      setSavingTeam(false);
      setToast({ visible: true, message: '팀 저장에 실패했습니다.' });
    }
  };

  const handleDeleteTeam = (id: string) => {
    const team = teams.find((item) => item.id === id);
    if (team?.locked) {
      setToast({ visible: true, message: '잠금된 팀은 삭제할 수 없습니다.' });
      return;
    }

    setConfirmDialog({
      message: `'${team?.name ?? '팀'}'을 삭제하시겠습니까?`,
      onConfirm: async () => {
        try {
          await deleteTeam(id);
        } catch {
          setToast({ visible: true, message: '팀 삭제에 실패했습니다.' });
        }
      },
    });
  };

  const handleToggleLock = async (id: string) => {
    const team = displayTeams.find((t) => t.id === id);
    if (!team) return;
    const newLocked = !team.locked;

    // 즉시 UI 반영 (낙관적 업데이트)
    setOptimisticTeams((prev) => {
      const exists = prev.some((t) => t.id === id);
      return exists
        ? prev.map((t) => (t.id === id ? { ...t, locked: newLocked } : t))
        : [...prev, { ...team, locked: newLocked }];
    });

    try {
      await toggleTeamLock(id, team.locked);
    } catch {
      // 실패 시 롤백
      setOptimisticTeams((prev) =>
        prev.map((t) => (t.id === id ? { ...t, locked: team.locked } : t))
      );
      setToast({ visible: true, message: '팀 잠금 상태 변경에 실패했습니다.' });
    }
  };

  const handleAutoMatch = async () => {
    try {
      const result = await autoMatch(matchOptions);
      // 배정 결과를 즉시 UI에 반영
      if (result.assignments.length > 0) {
        const assignMap = new Map(result.assignments.map(({ participantId, teamId }) => [participantId, teamId]));
        setOptimisticParticipants((prev) => {
          const updated = new Map(prev.map((p) => [p.id, p]));
          for (const [participantId, teamId] of assignMap) {
            const base = displayParticipants.find((p) => p.id === participantId);
            if (base) updated.set(participantId, { ...base, team: teamId });
          }
          return Array.from(updated.values());
        });
      }
      setToast({
        visible: true,
        message: `${result.matched}명 자동 배정 완료, ${result.unmatched}명 미배정`,
      });
    } catch {
      setToast({ visible: true, message: '자동 매칭 실행에 실패했습니다.' });
    }
  };

  return (
    <AdminLayout>
      <Toast toast={toast} onHide={hideToast} />

      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDialog(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm text-gray-700">{confirmDialog.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                {confirmDialog.confirmLabel ?? '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5 flex border-b border-gray-200">
        {(['participants', 'teams'] as Tab[]).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === item
                ? 'border-[#fcaf17] text-[#80766b]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {item === 'participants'
              ? `참가자 (${displayParticipants.length})`
              : `팀 (${displayTeams.length})`}
          </button>
        ))}
      </div>

      {tab === 'participants' ? (
        <ParticipantsTab
          filteredParticipants={filteredParticipants}
          search={search}
          setSearch={setSearch}
          teams={displayTeams}
          teamName={teamName}
          isInLockedTeam={isInLockedTeam}
          newRows={newRows}
          visibleEditRows={visibleEditRows}
          onAddRow={addParticipantRow}
          onStartEdit={startEditParticipant}
          onDelete={handleDeleteParticipant}
          onResetPassword={handleResetPassword}
          onDraftChange={updateDraftField}
          onCancelDraft={cancelDraft}
          onSaveAll={handleSaveParticipants}
          savingParticipants={savingParticipants}
          openDraftCount={openDraftCount}
          xlsxInputRef={xlsxInputRef}
          onImportExcel={handleImportExcel}
        />
      ) : (
        <TeamsTab
          teams={displayTeams}
          participants={displayParticipants}
          matchOptions={matchOptions}
          setMatchOptions={setMatchOptions}
          onAutoMatch={handleAutoMatch}
          onAddTeam={openTAdd}
          onEditTeam={openTEdit}
          onDeleteTeam={handleDeleteTeam}
          onToggleLock={handleToggleLock}
        />
      )}

      {tModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeTModal} />
          <div className="relative flex h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  {tModal.mode === 'add' ? '팀 추가' : '팀 수정'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {tModal.mode === 'add'
                    ? '승인되었고 팀이 없는 참가자를 선택해 새 팀을 구성합니다.'
                    : '팀 정보와 팀원 구성을 같은 화면에서 수정합니다.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTeamSubmit}
                  disabled={!tForm.name.trim() || savingTeam}
                  className="hidden rounded-xl bg-[#80766b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6e645a] disabled:cursor-not-allowed disabled:opacity-40 lg:block"
                >
                  {savingTeam ? '저장 중...' : tModal.mode === 'add' ? '팀 생성' : '팀 저장'}
                </button>
                <button
                  onClick={closeTModal}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="hidden min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
              <div className="h-full min-h-0 rounded-2xl border border-gray-200 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="참가자명 검색"
                      value={tAssignment.search}
                      onChange={(event) =>
                        setTAssignment((prev) => ({ ...prev, search: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={
                          filteredTeamAddCandidates.length > 0 &&
                          filteredTeamAddCandidates.every((participant) =>
                            tAssignment.checkedCandidateIds.includes(participant.id)
                          )
                        }
                        onChange={toggleAllCandidatesChecked}
                        className="h-4 w-4 accent-[#80766b]"
                      />
                      전체 선택
                    </label>
                    <button
                      onClick={moveCheckedCandidatesToSelected}
                      disabled={tAssignment.checkedCandidateIds.length === 0}
                      className="rounded-lg bg-[#80766b] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6e645a] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      선택 추가
                    </button>
                  </div>
                </div>

                <div className="h-[320px] overflow-y-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                        <th className="w-12 px-4 py-3">
                          <span className="sr-only">선택</span>
                        </th>
                        <th className="px-4 py-3">이름</th>
                        <th className="px-4 py-3">부서</th>
                        <th className="px-4 py-3">직급</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTeamAddCandidates.map((participant) => (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={tAssignment.checkedCandidateIds.includes(participant.id)}
                              onChange={() => toggleCandidateChecked(participant.id)}
                              className="h-4 w-4 accent-[#80766b]"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{participant.name}</td>
                          <td className="px-4 py-3 text-gray-500">{participant.department || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{participant.position || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTeamAddCandidates.length === 0 && (
                    <p className="py-10 text-center text-sm text-gray-400">
                      선택 가능한 참가자가 없습니다.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 p-4">
                <div className="mb-3 rounded-2xl bg-[#80766b]/8 px-4 py-3">
                  <p className="text-xs font-medium text-gray-500">
                    {tModal.mode === 'add' ? '자동 생성 팀 번호' : '현재 팀'}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#80766b]">
                    {tModal.mode === 'add' ? getNextTeamLabel(displayTeams) : tForm.name}
                  </p>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="space-y-4">
                    <FormField label="팀 이름" required error={tErrors.name}>
                      <input
                        type="text"
                        placeholder="예: 5조"
                        value={tForm.name}
                        onChange={(event) => {
                          setTForm((prev) => ({ ...prev, name: event.target.value }));
                          if (tErrors.name) {
                            setTErrors((prev) => ({ ...prev, name: undefined }));
                          }
                        }}
                        className={modalInputClass(!!tErrors.name)}
                      />
                    </FormField>

                    <FormField label="팀 설명">
                      <textarea
                        placeholder="팀 설명을 입력해 주세요."
                        value={tForm.idea}
                        onChange={(event) =>
                          setTForm((prev) => ({ ...prev, idea: event.target.value }))
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
                      />
                    </FormField>
                  </div>

                  <div className="mt-4 flex min-h-0 flex-1 flex-col">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">선택된 참가자</p>
                      <span className="text-xs text-gray-400">총 {selectedTeamParticipants.length}명</span>
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3">
                      {selectedTeamParticipants.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">
                          좌측에서 참가자를 선택해 추가해 주세요.
                        </p>
                      ) : (
                        selectedTeamParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-800">{participant.name}</p>
                              <p className="text-xs text-gray-400">
                                {participant.department || '-'} / {participant.position || '-'}
                              </p>
                            </div>
                            <button
                              onClick={() => removeSelectedParticipant(participant.id)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              title="제거"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
              <div className="mb-3 rounded-2xl bg-[#80766b]/8 px-4 py-3">
                <p className="text-xs font-medium text-gray-500">
                  {tModal.mode === 'add' ? '자동 생성 팀 번호' : '현재 팀'}
                </p>
                <p className="mt-1 text-2xl font-bold text-[#80766b]">
                  {tModal.mode === 'add' ? getNextTeamLabel(displayTeams) : tForm.name}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="space-y-4">
                      <FormField label="팀 이름" required error={tErrors.name}>
                        <input
                          type="text"
                          placeholder="예: 5조"
                          value={tForm.name}
                          onChange={(event) => {
                            setTForm((prev) => ({ ...prev, name: event.target.value }));
                            if (tErrors.name) {
                              setTErrors((prev) => ({ ...prev, name: undefined }));
                            }
                          }}
                          className={modalInputClass(!!tErrors.name)}
                        />
                      </FormField>

                      <FormField label="팀 설명">
                        <textarea
                          placeholder="팀 설명을 입력해 주세요."
                          value={tForm.idea}
                          onChange={(event) =>
                            setTForm((prev) => ({ ...prev, idea: event.target.value }))
                          }
                          rows={3}
                          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="mb-3 space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="참가자명 검색"
                          value={tAssignment.search}
                          onChange={(event) =>
                            setTAssignment((prev) => ({ ...prev, search: event.target.value }))
                          }
                          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={
                              filteredTeamAddCandidates.length > 0 &&
                              filteredTeamAddCandidates.every((participant) =>
                                tAssignment.checkedCandidateIds.includes(participant.id)
                              )
                            }
                            onChange={toggleAllCandidatesChecked}
                            className="h-4 w-4 accent-[#80766b]"
                          />
                          전체 선택
                        </label>
                        <button
                          onClick={moveCheckedCandidatesToSelected}
                          disabled={tAssignment.checkedCandidateIds.length === 0}
                          className="rounded-lg bg-[#80766b] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6e645a] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          선택 추가
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {filteredTeamAddCandidates.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">
                          선택 가능한 참가자가 없습니다.
                        </p>
                      ) : (
                        filteredTeamAddCandidates.map((participant) => (
                          <label
                            key={participant.id}
                            className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-3"
                          >
                            <input
                              type="checkbox"
                              checked={tAssignment.checkedCandidateIds.includes(participant.id)}
                              onChange={() => toggleCandidateChecked(participant.id)}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[#80766b]"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">{participant.name}</p>
                              <p className="mt-1 text-xs text-gray-400">
                                {participant.department || '-'} / {participant.position || '-'}
                              </p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">선택된 참가자</p>
                      <span className="text-xs text-gray-400">총 {selectedTeamParticipants.length}명</span>
                    </div>

                    <div className="max-h-[240px] space-y-2 overflow-y-auto rounded-xl bg-gray-50 p-2">
                      {selectedTeamParticipants.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">
                          좌측 목록에서 참가자를 선택해 추가해 주세요.
                        </p>
                      ) : (
                        selectedTeamParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">{participant.name}</p>
                              <p className="mt-1 text-xs text-gray-400">
                                {participant.department || '-'} / {participant.position || '-'}
                              </p>
                            </div>
                            <button
                              onClick={() => removeSelectedParticipant(participant.id)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              title="제거"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={closeTModal}
                  className="flex-1 rounded-xl bg-gray-100 py-3 text-sm text-gray-600 transition-colors hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={handleTeamSubmit}
                  disabled={!tForm.name.trim() || savingTeam}
                  className="flex-1 rounded-xl bg-[#80766b] py-3 text-sm font-medium text-white transition-colors hover:bg-[#6e645a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingTeam ? '저장 중...' : tModal.mode === 'add' ? '팀 생성' : '팀 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function ParticipantsTab({
  filteredParticipants,
  search,
  setSearch,
  teams,
  teamName,
  isInLockedTeam,
  newRows,
  visibleEditRows,
  onAddRow,
  onStartEdit,
  onDelete,
  onResetPassword,
  onDraftChange,
  onCancelDraft,
  onSaveAll,
  savingParticipants,
  openDraftCount,
  xlsxInputRef,
  onImportExcel,
}: {
  filteredParticipants: Participant[];
  search: string;
  setSearch: (value: string) => void;
  teams: Team[];
  teamName: (id: string) => string;
  isInLockedTeam: (participant: Participant) => boolean;
  newRows: ParticipantDraftRow[];
  visibleEditRows: ParticipantDraftRow[];
  onAddRow: () => void;
  onStartEdit: (participant: Participant) => void;
  onDelete: (id: string) => void;
  onResetPassword: (id: string) => void;
  onDraftChange: (
    key: string,
    field: keyof ParticipantFormState,
    value: string
  ) => void;
  onCancelDraft: (key: string) => void;
  onSaveAll: () => void;
  savingParticipants: boolean;
  openDraftCount: number;
  xlsxInputRef: React.RefObject<HTMLInputElement | null>;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const editRowMap = useMemo(
    () => Object.fromEntries(visibleEditRows.map((draft) => [draft.id, draft])),
    [visibleEditRows]
  );

  const hasDrafts = openDraftCount > 0;
  const addDisabled = newRows.length >= MAX_NEW_ROWS;
  const rowsEmpty = filteredParticipants.length === 0 && newRows.length === 0;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 이메일, 부서, 직급으로 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSaveAll}
            disabled={!hasDrafts || savingParticipants}
            className="rounded-lg bg-[#fcaf17] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e09c10] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingParticipants ? '저장 중...' : `일괄 저장${hasDrafts ? ` (${openDraftCount})` : ''}`}
          </button>
          <button
            onClick={onAddRow}
            disabled={addDisabled}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#80766b] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6e645a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            참가자 추가
          </button>
          <input
            ref={xlsxInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={onImportExcel}
          />
          <button
            onClick={() => xlsxInputRef.current?.click()}
            disabled={addDisabled}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#80766b] px-3 py-2 text-sm font-medium text-[#80766b] transition-colors hover:bg-[#80766b]/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" />
            엑셀 일괄 등록
          </button>
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-gray-500">
          <p>좌우 스크롤로 전체 내용 확인</p>
          <p className="shrink-0">신규 행 {newRows.length}/{MAX_NEW_ROWS}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] table-fixed text-sm">
            <colgroup>
              <col style={{ width: 150 }} />
              <col style={{ width: 220 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 170 }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="pb-3 pr-3">이름</th>
                <th className="pb-3 pr-3">이메일</th>
                <th className="pb-3 pr-3">팀</th>
                <th className="pb-3 pr-3">부서</th>
                <th className="pb-3 pr-3">직급</th>
                <th className="pb-3 pr-3">상태</th>
                <th className="pb-3">동작</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {newRows.map((draft) => (
                <ParticipantEditableRow
                  key={draft.key}
                  draft={draft}
                  teams={teams}
                  onDraftChange={onDraftChange}
                  onCancel={onCancelDraft}
                />
              ))}

              {filteredParticipants.map((participant) => {
                const draft = editRowMap[participant.id];
                if (draft) {
                  return (
                    <ParticipantEditableRow
                      key={draft.key}
                      draft={draft}
                      teams={teams}
                      onDraftChange={onDraftChange}
                      onCancel={onCancelDraft}
                    />
                  );
                }

                const locked = isInLockedTeam(participant);
                return (
                  <tr key={participant.id} className="transition-colors hover:bg-gray-50">
                    <td className="py-3 pr-3 font-medium text-gray-800">{participant.name}</td>
                    <td className="truncate py-3 pr-3 text-gray-500">{participant.email}</td>
                    <td className="py-3 pr-3 text-gray-300">—</td>
                    <td className="py-3 pr-3 text-gray-500">
                      <span className="flex items-center gap-1">
                        {teamName(participant.team)}
                        {locked && <Lock className="h-3 w-3 text-amber-500" />}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-gray-500">{participant.department || '-'}</td>
                    <td className="py-3 pr-3 text-gray-500">{participant.position || '-'}</td>
                    <td className="py-3 pr-3 text-gray-500">{statusLabel(participant.status)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onStartEdit(participant)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#80766b]/10 hover:text-[#80766b]"
                          title="수정"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onResetPassword(participant.id)}
                          disabled={!participant.userId}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
                          title={participant.userId ? '비밀번호 초기화' : '연결된 계정 없음'}
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(participant.id)}
                          disabled={locked}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                          title={locked ? '잠금된 팀 소속 참가자는 삭제할 수 없습니다.' : '삭제'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rowsEmpty && (
          <p className="py-10 text-center text-sm text-gray-400">검색 결과가 없습니다.</p>
        )}
      </Card>
    </>
  );
}

function ParticipantEditableRow({
  draft,
  teams,
  onDraftChange,
  onCancel,
}: {
  draft: ParticipantDraftRow;
  teams: Team[];
  onDraftChange: (
    key: string,
    field: keyof ParticipantFormState,
    value: string
  ) => void;
  onCancel: (key: string) => void;
}) {
  return (
    <tr className="bg-[#fffaf0] align-top">
      <td className="py-3 pr-3">
        <input
          type="text"
          value={draft.form.name}
          onChange={(event) => onDraftChange(draft.key, 'name', event.target.value)}
          className={tableInputClass(!!draft.errors.name)}
          placeholder="이름"
        />
        {draft.errors.name && <p className="mt-1 text-xs text-red-500">{draft.errors.name}</p>}
      </td>
      <td className="py-3 pr-3">
        <input
          type="email"
          value={draft.form.email}
          onChange={(event) => onDraftChange(draft.key, 'email', event.target.value)}
          className={tableInputClass(!!draft.errors.email)}
          placeholder="example@company.com"
        />
        {draft.errors.email && (
          <p className="mt-1 text-xs text-red-500">{draft.errors.email}</p>
        )}
      </td>
      <td className="py-3 pr-3">
        <select
          value={draft.form.team}
          onChange={(event) => onDraftChange(draft.key, 'team', event.target.value)}
          disabled={draft.teamLocked}
          className={`${tableInputClass(!!draft.errors.team)} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`}
        >
          <option value="">팀 없음</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id} disabled={team.locked}>
              {team.name}
              {team.locked ? ' (잠금)' : ''}
            </option>
          ))}
        </select>
        {draft.errors.team && <p className="mt-1 text-xs text-red-500">{draft.errors.team}</p>}
        {draft.teamLocked && (
          <p className="mt-1 text-xs text-amber-600">
            잠금된 팀 소속 참가자는 팀을 변경할 수 없습니다.
          </p>
        )}
      </td>
      <td className="py-3 pr-3">
        <input
          type="text"
          value={draft.form.department}
          onChange={(event) => onDraftChange(draft.key, 'department', event.target.value)}
          className={tableInputClass(false)}
          placeholder="부서"
        />
      </td>
      <td className="py-3 pr-3">
        <input
          type="text"
          value={draft.form.position}
          onChange={(event) => onDraftChange(draft.key, 'position', event.target.value)}
          className={tableInputClass(false)}
          placeholder="직급"
        />
      </td>
      <td className="py-3 pr-3">
        <select
          value={draft.form.status}
          onChange={(event) =>
            onDraftChange(draft.key, 'status', event.target.value as ParticipantFormState['status'])
          }
          className={tableInputClass(false)}
        >
          <option value="pending">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">거절</option>
        </select>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-[#80766b]">
            {draft.mode === 'new' ? '신규' : '수정 중'}
          </span>
          <button
            onClick={() => onCancel(draft.key)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="취소"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function TeamsTab({
  teams,
  participants,
  matchOptions,
  setMatchOptions,
  onAutoMatch,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onToggleLock,
}: {
  teams: Team[];
  participants: Participant[];
  matchOptions: AutoMatchOptions;
  setMatchOptions: React.Dispatch<React.SetStateAction<AutoMatchOptions>>;
  onAutoMatch: () => void;
  onAddTeam: () => void;
  onEditTeam: (id: string) => void;
  onDeleteTeam: (id: string) => void;
  onToggleLock: (id: string) => void;
}) {
  return (
    <>
      <Card className="mb-5">
        <div className="mb-4 flex items-center gap-2">
          <Shuffle className="h-5 w-5 text-[#80766b]" />
          <h3 className="text-sm font-semibold text-gray-700">자동 매칭</h3>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">팀 크기</label>
            <input
              type="number"
              min={1}
              max={20}
              value={matchOptions.teamSize}
              onChange={(event) =>
                setMatchOptions((prev) => ({
                  ...prev,
                  teamSize: Math.max(1, Number(event.target.value) || 1),
                }))
              }
              className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#80766b]/30"
            />
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[
              { key: 'spreadDepartment' as const, label: '부서 분산' },
              { key: 'spreadPosition' as const, label: '직급 분산' },
              { key: 'limitLeader' as const, label: '리더 제한' },
            ].map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={matchOptions[key]}
                  onChange={(event) =>
                    setMatchOptions((prev) => ({ ...prev, [key]: event.target.checked }))
                  }
                  className="h-4 w-4 accent-[#80766b]"
                />
                <span className="text-sm text-gray-600">{label}</span>
              </label>
            ))}
          </div>

          <button
            onClick={onAutoMatch}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#fcaf17] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e09c10]"
          >
            <Shuffle className="h-4 w-4" />
            자동 매칭 실행
          </button>
        </div>
      </Card>

      <div className="mb-4 flex justify-end">
        <button
          onClick={onAddTeam}
          className="flex items-center gap-1.5 rounded-lg bg-[#80766b] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6e645a]"
        >
          <Plus className="h-4 w-4" />
          팀 추가
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {teams.map((team) => {
          const members = participants.filter((participant) => participant.team === team.id);
          return (
            <Card key={team.id} className={team.locked ? 'ring-1 ring-amber-200' : ''}>
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0 flex items-center gap-2">
                  <h3 className="truncate font-semibold text-gray-800">{team.name}</h3>
                  {team.locked && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                      <Lock className="h-3 w-3" />
                      잠금
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => onToggleLock(team.id)}
                    className={`rounded-lg p-1.5 transition-colors ${
                      team.locked
                        ? 'text-amber-500 hover:bg-amber-50'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                    title={team.locked ? '잠금 해제' : '잠금'}
                  >
                    {team.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => onEditTeam(team.id)}
                    disabled={team.locked}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#80766b]/10 hover:text-[#80766b] disabled:cursor-not-allowed disabled:opacity-30"
                    title="수정"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTeam(team.id)}
                    disabled={team.locked}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {team.idea && <p className="mb-3 line-clamp-2 text-xs text-gray-500">{team.idea}</p>}

              <div className="border-t border-gray-100 pt-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-400">
                    참가자 {members.length}명
                  </span>
                </div>
                {members.length === 0 ? (
                  <p className="text-xs italic text-gray-300">배정된 참가자가 없습니다.</p>
                ) : (
                  <div className="space-y-1.5">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-700">{member.name}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-xs text-gray-400">{member.department}</span>
                          <span className="text-xs text-gray-300">/</span>
                          <span className="text-xs text-gray-400">{member.position}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
