"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

type Player = {
  id: string;
  name: string;
  nickname: string;
  role: string;
  participation: string;
  attack: number | null;
  defense: number | null;
  intensity: number | null;
  overall: number | null;
  photo_url: string | null;
};

type Session = {
  id: string;
  group_id: string;
  name: string;
  location: string | null;
  starts_at: string;
  line_players_per_team: number;
  match_minutes: number;
  status: string;
  teams_generated_count: number;
};

type QueueItem = {
  id: string;
  session_id: string;
  player_id: string;
  queue_position: number;
  origin_team_number: number | null;
};

type PointRow = {
  id: string;
  session_id: string;
  match_id: string;
  player_id: string;
  points: number;
  result: "WIN" | "LOSS" | "DRAW";
  created_at: string;
};

type DayRankingRow = {
  player: Player;
  totalPoints: number;
  wins: number;
  draws: number;
  losses: number;
  matches: number;
};

export default function SessionViewPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [leftEarly, setLeftEarly] = useState<Record<string, boolean>>({});
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [points, setPoints] = useState<PointRow[]>([]);
  const [latePlayerId, setLatePlayerId] = useState("");
  const [quickGuestName, setQuickGuestName] = useState("");
  const [quickGuestNickname, setQuickGuestNickname] = useState("");
  const [showDrawOptions, setShowDrawOptions] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const alreadySpokeRef = useRef(false);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    if (!session) return;

    const limitSeconds = session.match_minutes * 60;

    if (seconds >= limitSeconds && isTimerRunning && !alreadySpokeRef.current) {
      alreadySpokeRef.current = true;
      setIsTimerRunning(false);
      speakEndMatch();
      alert("Fim da partida!");
    }
  }, [seconds, isTimerRunning, session]);

  async function loadData() {
    if (!sessionId) {
      setMessage("ID do horário não informado.");
      setLoading(false);
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionData) {
      setMessage("Horário não encontrado.");
      setLoading(false);
      return;
    }

    const { data: playersData } = await supabase
      .from("players")
      .select(
        "id, name, nickname, role, participation, attack, defense, intensity, overall, photo_url"
      )
      .eq("active", true)
      .eq("group_id", sessionData.group_id)
      .order("nickname");

    const { data: attendanceData } = await supabase
      .from("session_attendance")
      .select("*")
      .eq("session_id", sessionId);

    const { data: queueData } = await supabase
      .from("session_queue")
      .select("*")
      .eq("session_id", sessionId)
      .order("queue_position");

    const { data: matchesData } = await supabase
      .from("session_matches")
      .select("id")
      .eq("session_id", sessionId);

    const { data: pointsData } = await supabase
      .from("player_match_points")
      .select("id, session_id, match_id, player_id, points, result, created_at")
      .eq("session_id", sessionId);

    setSession(sessionData);
    setPlayers(playersData || []);
    setQueue(queueData || []);
    setMatchCount(matchesData?.length || 0);
    setPoints(pointsData || []);

    const presenceMap: Record<string, boolean> = {};
    const leftEarlyMap: Record<string, boolean> = {};

    attendanceData?.forEach((item) => {
      presenceMap[item.player_id] = item.status === "present";
      leftEarlyMap[item.player_id] = !!item.left_early;
    });

    setAttendance(presenceMap);
    setLeftEarly(leftEarlyMap);
    setLoading(false);
  }

  async function registerMatchAndPoints({
    result,
    teamA,
    teamB,
  }: {
    result: "A" | "B" | "DRAW";
    teamA: Player[];
    teamB: Player[];
  }) {
    if (!sessionId) return;

    const nextMatchNumber = matchCount + 1;

    const { data: matchData, error: matchError } = await supabase
      .from("session_matches")
      .insert({
        session_id: sessionId,
        match_number: nextMatchNumber,
        result,
        team_a_player_ids: teamA.map((player) => player.id),
        team_b_player_ids: teamB.map((player) => player.id),
      })
      .select()
      .single();

    if (matchError || !matchData) {
      setMessage(`Erro ao registrar partida: ${matchError?.message}`);
      return;
    }

    const pointRows = [
      ...teamA.map((player) => ({
        session_id: sessionId,
        match_id: matchData.id,
        player_id: player.id,
        points: result === "A" ? 3 : result === "DRAW" ? 1 : 0,
        result: result === "A" ? "WIN" : result === "DRAW" ? "DRAW" : "LOSS",
      })),
      ...teamB.map((player) => ({
        session_id: sessionId,
        match_id: matchData.id,
        player_id: player.id,
        points: result === "B" ? 3 : result === "DRAW" ? 1 : 0,
        result: result === "B" ? "WIN" : result === "DRAW" ? "DRAW" : "LOSS",
      })),
    ];

    const { error: pointsError } = await supabase
      .from("player_match_points")
      .insert(pointRows);

    if (pointsError) {
      setMessage(`Erro ao registrar pontuação: ${pointsError.message}`);
      return;
    }

    setMatchCount(nextMatchNumber);
  }

  async function saveAttendance() {
    if (!sessionId) return;

    const rows = players.map((player) => ({
      session_id: sessionId,
      player_id: player.id,
      status: attendance[player.id] ? "present" : "absent",
      left_early: leftEarly[player.id] || false,
    }));

    const { error } = await supabase.from("session_attendance").upsert(rows, {
      onConflict: "session_id,player_id",
    });

    if (error) {
      alert(`Erro ao salvar presença: ${error.message}`);
      return;
    }

    alert("Presença salva com sucesso!");
    await loadData();
  }

  async function saveQueue(playerIds: string[]) {
    if (!sessionId || !session) return;

    await supabase.from("session_queue").delete().eq("session_id", sessionId);

    const rows = playerIds.map((playerId, index) => ({
      session_id: sessionId,
      player_id: playerId,
      queue_position: index + 1,
      origin_team_number: Math.floor(index / session.line_players_per_team) + 1,
    }));

    if (rows.length > 0) {
      const { error } = await supabase.from("session_queue").insert(rows);

      if (error) {
        setMessage(`Erro ao atualizar fila: ${error.message}`);
        return;
      }
    }

    await loadData();
  }

  function getQueuePlayers() {
    return queue
      .map((item) => players.find((player) => player.id === item.player_id))
      .filter(Boolean) as Player[];
  }

  function chunkQueue(queuePlayers: Player[]) {
    if (!session) return [];

    const size = session.line_players_per_team;
    const chunks: Player[][] = [];

    for (let i = 0; i < queuePlayers.length; i += size) {
      chunks.push(queuePlayers.slice(i, i + size));
    }

    return chunks;
  }

  async function addPlayerToQueue(playerId: string) {
    if (!sessionId) return;

    const alreadyInQueue = queue.some((item) => item.player_id === playerId);

    if (alreadyInQueue) {
      setMessage("Esse jogador já está na lista geral.");
      return;
    }

    await supabase.from("session_attendance").upsert(
      {
        session_id: sessionId,
        player_id: playerId,
        status: "present",
        left_early: false,
      },
      {
        onConflict: "session_id,player_id",
      }
    );

    const currentQueue = getQueuePlayers().map((player) => player.id);

    await saveQueue([...currentQueue, playerId]);
    setMessage("Jogador adicionado ao final da lista geral!");
  }

  async function addLatePlayer() {
    if (!latePlayerId) {
      setMessage("Selecione um jogador atrasado.");
      return;
    }

    await addPlayerToQueue(latePlayerId);
    setLatePlayerId("");
  }

  async function createQuickGuestAndAddLate() {
    if (!session) return;

    const name = quickGuestName.trim();
    const nickname = quickGuestNickname.trim() || name;

    if (!name) {
      setMessage("Informe o nome do convidado.");
      return;
    }

    const { data, error } = await supabase
      .from("players")
      .insert({
        group_id: session.group_id,
        name,
        nickname,
        role: "line",
        participation: "guest",
        attack: null,
        defense: null,
        intensity: null,
        active: true,
      })
      .select()
      .single();

    if (error || !data) {
      setMessage(`Erro ao criar convidado: ${error?.message}`);
      return;
    }

    setQuickGuestName("");
    setQuickGuestNickname("");
    await addPlayerToQueue(data.id);
  }

  async function handlePlayerLeftEarly(playerId: string) {
    if (!sessionId) return;

    const player = players.find((item) => item.id === playerId);
    const confirmLeave = confirm(
      `Confirmar que ${player?.nickname || "este jogador"} foi embora mais cedo?`
    );

    if (!confirmLeave) return;

    await supabase.from("session_attendance").upsert(
      {
        session_id: sessionId,
        player_id: playerId,
        status: "present",
        left_early: true,
      },
      {
        onConflict: "session_id,player_id",
      }
    );

    const updatedQueue = getQueuePlayers()
      .filter((player) => player.id !== playerId)
      .map((player) => player.id);

    await saveQueue(updatedQueue);
    setMessage(`${player?.nickname || "Jogador"} foi retirado da fila.`);
  }

  async function generateTeamsAndQueue() {
    if (!sessionId || !session) return;

    if (session.teams_generated_count >= 1) {
      setMessage(
        "Os times já foram gerados para este horário. Para evitar manipulação, a geração é permitida apenas uma vez."
      );
      return;
    }

    const presentLinePlayers = players.filter(
      (player) =>
        attendance[player.id] &&
        !leftEarly[player.id] &&
        player.role === "line"
    );

    if (presentLinePlayers.length < session.line_players_per_team * 2) {
      setMessage(
        "É necessário ter jogadores suficientes para formar pelo menos 2 times completos."
      );
      return;
    }

    const playersPerTeam = session.line_players_per_team;

    const shuffledPlayers = [...presentLinePlayers].sort(
      () => Math.random() - 0.5
    );

    const sortedPlayers = shuffledPlayers.sort(
      (a, b) => (b.overall ?? 0) - (a.overall ?? 0)
    );

    const queueOrder: Player[] = [];

    while (sortedPlayers.length > 0) {
      const team = sortedPlayers.splice(0, playersPerTeam);
      queueOrder.push(...team);
    }

    await saveQueue(queueOrder.map((player) => player.id));

    await supabase
      .from("sessions")
      .update({
        teams_generated_count: session.teams_generated_count + 1,
      })
      .eq("id", sessionId);

    setMessage("Times e lista geral gerados com sucesso!");
    await loadData();
  }

  async function handleTeamAWins() {
    await applyWinLoss("A");
  }

  async function handleTeamBWins() {
    await applyWinLoss("B");
  }

  async function applyWinLoss(winner: "A" | "B") {
    if (!session) return;

    const playersPerTeam = session.line_players_per_team;
    const queuePlayers = getQueuePlayers();
    const chunks = chunkQueue(queuePlayers);

    const teamA = chunks[0] || [];
    const teamB = chunks[1] || [];
    const waitingPlayers = queuePlayers.slice(playersPerTeam * 2);

    if (teamA.length === 0 || teamB.length === 0) {
      setMessage("Não há dois times em campo para aplicar resultado.");
      return;
    }

    const winnerTeam = winner === "A" ? teamA : teamB;
    const loserTeam = winner === "A" ? teamB : teamA;

    await registerMatchAndPoints({
      result: winner,
      teamA,
      teamB,
    });

    let newQueue: Player[] = [];

    if (waitingPlayers.length >= playersPerTeam) {
      const nextTeam = waitingPlayers.slice(0, playersPerTeam);
      const remainingWaiting = waitingPlayers.slice(playersPerTeam);

      newQueue = [...winnerTeam, ...nextTeam, ...remainingWaiting, ...loserTeam];
    } else if (waitingPlayers.length > 0) {
      const incoming = waitingPlayers;
      const numberToReplace = incoming.length;

      const stayingLoserPlayers = loserTeam.slice(
        0,
        loserTeam.length - numberToReplace
      );

      const leavingLoserPlayers = loserTeam.slice(
        loserTeam.length - numberToReplace
      );

      const recomposedTeam = [...stayingLoserPlayers, ...incoming];

      newQueue = [...winnerTeam, ...recomposedTeam, ...leavingLoserPlayers];
    } else {
      newQueue = [...winnerTeam, ...loserTeam];
    }

    await saveQueue(newQueue.map((player) => player.id));
    resetTimer();

    setMessage(
      winner === "A"
        ? "Resultado aplicado: Time A venceu. Pontuação registrada."
        : "Resultado aplicado: Time B venceu. Pontuação registrada."
    );
  }

  function openDrawOptions() {
    if (teamA.length === 0 || teamB.length === 0) {
      setMessage("Não há dois times em campo para aplicar empate.");
      return;
    }

    setShowDrawOptions(true);
  }

  async function handleDrawWinner(winner: "A" | "B") {
    setShowDrawOptions(false);

    if (hasTwoCompleteOutsideTeams) {
      await handleDrawTwoCompleteOutside(winner);
    } else {
      await handleDrawKeepWinner(winner);
    }
  }

  async function handleDrawTwoCompleteOutside(winner: "A" | "B") {
    if (!session) return;

    const playersPerTeam = session.line_players_per_team;
    const queuePlayers = getQueuePlayers();

    const teamA = queuePlayers.slice(0, playersPerTeam);
    const teamB = queuePlayers.slice(playersPerTeam, playersPerTeam * 2);

    const waitingPlayers = queuePlayers.slice(playersPerTeam * 2);

    const firstTwoOutsideTeams = waitingPlayers.slice(0, playersPerTeam * 2);
    const afterFirstTwoOutsideTeams = waitingPlayers.slice(playersPerTeam * 2);

    const winnerTeam = winner === "A" ? teamA : teamB;
    const loserTeam = winner === "A" ? teamB : teamA;

    if (firstTwoOutsideTeams.length < playersPerTeam * 2) {
      setMessage("Não existem duas equipes completas fora.");
      return;
    }

    await registerMatchAndPoints({
      result: "DRAW",
      teamA,
      teamB,
    });

    let newQueue: Player[] = [];

    if (
      afterFirstTwoOutsideTeams.length > 0 &&
      afterFirstTwoOutsideTeams.length < playersPerTeam
    ) {
      const incompleteTeam = afterFirstTwoOutsideTeams;
      const needed = playersPerTeam - incompleteTeam.length;

      const playersFromWinner = winnerTeam.slice(0, needed);
      const remainingWinner = winnerTeam.slice(needed);

      const completedTeam = [...incompleteTeam, ...playersFromWinner];

      newQueue = [
        ...firstTwoOutsideTeams,
        ...completedTeam,
        ...remainingWinner,
        ...loserTeam,
      ];
    } else {
      newQueue = [
        ...firstTwoOutsideTeams,
        ...afterFirstTwoOutsideTeams,
        ...winnerTeam,
        ...loserTeam,
      ];
    }

    await saveQueue(newQueue.map((player) => player.id));
    resetTimer();

    setMessage(
      winner === "A"
        ? "Empate aplicado: sorteio deu Time A. Pontuação registrada."
        : "Empate aplicado: sorteio deu Time B. Pontuação registrada."
    );
  }

  async function handleDrawKeepWinner(winner: "A" | "B") {
    if (!session) return;

    const playersPerTeam = session.line_players_per_team;
    const queuePlayers = getQueuePlayers();
    const chunks = chunkQueue(queuePlayers);

    const teamA = chunks[0] || [];
    const teamB = chunks[1] || [];
    const waitingPlayers = queuePlayers.slice(playersPerTeam * 2);

    const winnerTeam = winner === "A" ? teamA : teamB;
    const loserTeam = winner === "A" ? teamB : teamA;

    await registerMatchAndPoints({
      result: "DRAW",
      teamA,
      teamB,
    });

    if (waitingPlayers.length >= playersPerTeam) {
      const nextTeam = waitingPlayers.slice(0, playersPerTeam);
      const rest = waitingPlayers.slice(playersPerTeam);

      const newQueue = [...winnerTeam, ...nextTeam, ...rest, ...loserTeam];

      await saveQueue(newQueue.map((player) => player.id));
      resetTimer();
      setMessage(
        "Empate aplicado: vencedor do sorteio ficou em campo. Pontuação registrada."
      );
      return;
    }

    if (waitingPlayers.length > 0) {
      const incoming = waitingPlayers;
      const numberToReplace = incoming.length;

      const stayingLoserPlayers = loserTeam.slice(
        0,
        loserTeam.length - numberToReplace
      );

      const leavingLoserPlayers = loserTeam.slice(
        loserTeam.length - numberToReplace
      );

      const recomposedTeam = [...stayingLoserPlayers, ...incoming];

      const newQueue = [...winnerTeam, ...recomposedTeam, ...leavingLoserPlayers];

      await saveQueue(newQueue.map((player) => player.id));
      resetTimer();

      setMessage(
        "Empate aplicado: vencedor ficou e a barreira incompleta recompôs o outro time. Pontuação registrada."
      );

      return;
    }

    setMessage("Não há barreira fora para entrar.");
  }

  async function startSession() {
    if (!sessionId) return;

    await supabase
      .from("sessions")
      .update({ status: "in_progress" })
      .eq("id", sessionId);

    await loadData();
  }

  async function finishSession() {
    if (!sessionId) return;

    const confirmFinish = confirm("Deseja finalizar este horário?");
    if (!confirmFinish) return;

    await supabase
      .from("sessions")
      .update({ status: "finished" })
      .eq("id", sessionId);

    await loadData();
  }

  function speakEndMatch() {
    if (typeof window === "undefined") return;

    const utterance = new SpeechSynthesisUtterance("Fim da partida");
    utterance.lang = "pt-BR";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function startTimer() {
    alreadySpokeRef.current = false;
    setIsTimerRunning(true);
  }

  function pauseTimer() {
    setIsTimerRunning(false);
  }

  function resetTimer() {
    setIsTimerRunning(false);
    setSeconds(0);
    alreadySpokeRef.current = false;
  }

  const presentPlayers = players.filter((player) => attendance[player.id]);

  const linePresentPlayers = presentPlayers.filter(
    (player) => player.role === "line"
  );

  const goalkeeperPresentPlayers = presentPlayers.filter(
    (player) => player.role === "goalkeeper"
  );

  const queuePlayers = getQueuePlayers();
  const queueChunks = chunkQueue(queuePlayers);
  const teamA = queueChunks[0] || [];
  const teamB = queueChunks[1] || [];
  const barriers = queueChunks.slice(2);

  const completeOutsideTeamsCount = barriers.filter(
    (team) => session && team.length === session.line_players_per_team
  ).length;

  const hasTwoCompleteOutsideTeams = completeOutsideTeamsCount >= 2;

  const lateOptions = players.filter((player) => {
    const alreadyInQueue = queue.some((item) => item.player_id === player.id);
    return !alreadyInQueue;
  });

  const dayRanking = useMemo(() => {
    const map = new Map<string, DayRankingRow>();

    points.forEach((point) => {
      const player = players.find((item) => item.id === point.player_id);
      if (!player) return;

      if (!map.has(player.id)) {
        map.set(player.id, {
          player,
          totalPoints: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          matches: 0,
        });
      }

      const row = map.get(player.id)!;

      row.totalPoints += point.points;
      row.matches += 1;

      if (point.result === "WIN") row.wins += 1;
      if (point.result === "DRAW") row.draws += 1;
      if (point.result === "LOSS") row.losses += 1;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.player.nickname.localeCompare(b.player.nickname);
    });
  }, [points, players]);

  const topThree = dayRanking.slice(0, 3);
  const mostWinsPlayer = [...dayRanking].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.totalPoints - a.totalPoints;
  })[0];

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }, [seconds]);

  if (loading) {
    return <main style={{ padding: 24 }}>Carregando horário...</main>;
  }

  if (!session) {
    return <main style={{ padding: 24 }}>Horário não encontrado.</main>;
  }

  const isFinished = session.status === "finished";

  return (
    <main style={pageStyle}>
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          isPresent={!!attendance[selectedPlayer.id]}
          hasLeftEarly={!!leftEarly[selectedPlayer.id]}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {showDrawOptions && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ marginTop: 0, color: "#b71c1c" }}>
              Empate — quem venceu o sorteio?
            </h2>

            <p style={{ color: "#555", lineHeight: 1.5 }}>
              Escolha o time que venceu o sorteio. O aplicativo vai calcular
              automaticamente quem entra, quem sai e como a fila será recomposta.
            </p>

            {hasTwoCompleteOutsideTeams ? (
              <p style={modalInfoStyle}>
                Existem duas equipes completas fora. As duas equipes em campo
                sairão, entrarão as duas barreiras completas e, se houver time
                incompleto depois, ele será completado com o vencedor do sorteio.
              </p>
            ) : (
              <p style={modalInfoStyle}>
                Não existem duas equipes completas fora. O vencedor do sorteio
                ficará em campo e o app fará a recomposição conforme a fila.
              </p>
            )}

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <button onClick={() => handleDrawWinner("A")} style={primaryButton}>
                Time A venceu o sorteio
              </button>

              <button onClick={() => handleDrawWinner("B")} style={primaryButton}>
                Time B venceu o sorteio
              </button>

              <button
                onClick={() => setShowDrawOptions(false)}
                style={secondaryButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <section style={heroStyle}>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>
            {session.name}
          </h1>

          <p style={{ marginTop: 8, marginBottom: 16 }}>
            {session.location || "Local não informado"} •{" "}
            {new Date(session.starts_at).toLocaleString("pt-BR")}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Badge label={`Status: ${translateStatus(session.status)}`} />
            <Badge label={`Linha por time: ${session.line_players_per_team}`} />
            <Badge label={`Partida: ${session.match_minutes} min`} />
            <Badge label={`Presentes: ${presentPlayers.length}`} />
            <Badge label={`Linha: ${linePresentPlayers.length}`} />
            <Badge label={`Goleiros: ${goalkeeperPresentPlayers.length}`} />
            <Badge label={`Lista geral: ${queue.length}`} />
            <Badge label={`Gerações: ${session.teams_generated_count}/1`} />
            <Badge label={`Partidas: ${matchCount}`} />
          </div>
        </section>

        {message && <MessageBox message={message} />}

        <section style={cardStyle}>
          <h2 style={titleStyle}>Resumo do horário</h2>

          <div style={summaryGridStyle}>
            <SummaryCard label="Partidas" value={matchCount} />
            <SummaryCard label="Jogadores pontuados" value={dayRanking.length} />
            <SummaryCard
              label="Mais vitórias"
              value={
                mostWinsPlayer
                  ? `${mostWinsPlayer.player.nickname} (${mostWinsPlayer.wins})`
                  : "-"
              }
            />
          </div>

          <h3 style={{ color: "#b71c1c", marginTop: 22 }}>Top 3 do horário</h3>

          {topThree.length === 0 ? (
            <p style={{ color: "#777" }}>
              Ainda não há pontuação registrada neste horário.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topThree.map((row, index) => (
                <button
                  key={row.player.id}
                  onClick={() => setSelectedPlayer(row.player)}
                  style={topRowStyle}
                >
                  <strong>
                    {index + 1}º - {row.player.nickname}
                  </strong>

                  <span>
                    {row.totalPoints} pts • V:{row.wins} E:{row.draws} D:
                    {row.losses}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Controle do horário</h2>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <button onClick={startSession} disabled={isFinished} style={primaryButton}>
              Iniciar horário
            </button>

            <button onClick={finishSession} disabled={isFinished} style={dangerButton}>
              Finalizar horário
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Cronômetro da partida</h2>

          <div
            style={{
              fontSize: 54,
              fontWeight: 900,
              color: "#b71c1c",
              marginTop: 12,
            }}
          >
            {formattedTime}
          </div>

          <p style={{ color: "#666" }}>
            Tempo definido: {session.match_minutes} minutos. Ao atingir o tempo,
            o app falará: “Fim da partida”.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={startTimer} disabled={isFinished} style={primaryButton}>
              Iniciar partida
            </button>

            <button onClick={pauseTimer} disabled={isFinished} style={secondaryButton}>
              Pausar
            </button>

            <button onClick={resetTimer} disabled={isFinished} style={secondaryButton}>
              Zerar
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Partida atual</h2>

          <div style={teamGridStyle}>
            <TeamCard
              title="Time A"
              players={teamA}
              onLeftEarly={handlePlayerLeftEarly}
              onSelectPlayer={setSelectedPlayer}
            />
            <TeamCard
              title="Time B"
              players={teamB}
              onLeftEarly={handlePlayerLeftEarly}
              onSelectPlayer={setSelectedPlayer}
            />
          </div>

          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            <button onClick={handleTeamAWins} disabled={isFinished} style={primaryButton}>
              Vitória Time A
            </button>

            <button onClick={handleTeamBWins} disabled={isFinished} style={primaryButton}>
              Vitória Time B
            </button>

            <button onClick={openDrawOptions} disabled={isFinished} style={secondaryButton}>
              Empate
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Barreiras</h2>

          {barriers.length === 0 ? (
            <p style={{ color: "#777" }}>Nenhuma barreira formada.</p>
          ) : (
            <div style={teamGridStyle}>
              {barriers.map((team, index) => (
                <TeamCard
                  key={index}
                  title={`${index + 1}ª barreira`}
                  players={team}
                  onLeftEarly={handlePlayerLeftEarly}
                  onSelectPlayer={setSelectedPlayer}
                />
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Jogador atrasado / Reintegrar jogador</h2>

          <p style={{ color: "#666" }}>
            Selecione um jogador já cadastrado, convidado ou alguém que foi embora
            e voltou. Ele será marcado como presente novamente e entrará no final da lista geral.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <select
              value={latePlayerId}
              onChange={(e) => setLatePlayerId(e.target.value)}
              disabled={isFinished}
              style={inputStyle}
            >
              <option value="">Selecione o jogador</option>
              {lateOptions.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.nickname} - {player.role === "line" ? "Linha" : "Goleiro"} -{" "}
                  {player.participation === "official" ? "Oficial" : "Convidado"}
                  {leftEarly[player.id] ? " - foi embora" : ""}
                </option>
              ))}
            </select>

            <button onClick={addLatePlayer} disabled={isFinished} style={primaryButton}>
              Adicionar / reintegrar
            </button>
          </div>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #ffe082" }}>
            <h3 style={{ color: "#b71c1c", marginTop: 0 }}>Criar convidado rápido</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input
                value={quickGuestName}
                onChange={(e) => setQuickGuestName(e.target.value)}
                disabled={isFinished}
                placeholder="Nome do convidado"
                style={inputStyle}
              />

              <input
                value={quickGuestNickname}
                onChange={(e) => setQuickGuestNickname(e.target.value)}
                disabled={isFinished}
                placeholder="Apelido do convidado"
                style={inputStyle}
              />
            </div>

            <button
              onClick={createQuickGuestAndAddLate}
              disabled={isFinished}
              style={{ ...primaryButton, marginTop: 12 }}
            >
              Criar convidado e adicionar
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Gerar times</h2>

          <p style={{ color: "#666" }}>
            O sistema forma times respeitando a quantidade definida no horário.
            A geração é limitada para evitar manipulação dos times.
          </p>

          <button
            onClick={generateTeamsAndQueue}
            disabled={isFinished || session.teams_generated_count >= 1}
            style={primaryButton}
          >
            Gerar times e lista geral
          </button>
        </section>

        <section style={cardStyle}>
          <h2 style={titleStyle}>Lista geral</h2>

          {queuePlayers.length === 0 ? (
            <p style={{ color: "#777" }}>Nenhum jogador na lista geral ainda.</p>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {queuePlayers.map((player, index) => (
                <div key={player.id} style={queueRowStyle}>
                  <button
                    onClick={() => setSelectedPlayer(player)}
                    style={queuePlayerButtonStyle}
                  >
                    <PlayerAvatar player={player} size={34} />
                    <span>
                      #{index + 1} - {player.nickname}
                    </span>
                  </button>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: "#777" }}>
                      {player.role === "line" ? "Linha" : "Goleiro"}
                    </span>

                    <button
                      onClick={() => handlePlayerLeftEarly(player.id)}
                      disabled={isFinished}
                      style={smallDangerButton}
                    >
                      Foi embora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={titleStyle}>Marcar presença</h2>
              <p style={{ marginTop: 6, color: "#666" }}>
                Selecione quem está presente nesse horário.
              </p>
            </div>

            <button onClick={saveAttendance} disabled={isFinished} style={primaryButton}>
              Salvar presença
            </button>
          </div>

          <div style={playersGridStyle}>
            {players.map((player) => {
              const isPresent = !!attendance[player.id];
              const hasLeftEarly = !!leftEarly[player.id];

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (isFinished) return;

                    setAttendance((current) => ({
                      ...current,
                      [player.id]: !current[player.id],
                    }));

                    if (hasLeftEarly) {
                      setLeftEarly((current) => ({
                        ...current,
                        [player.id]: false,
                      }));
                    }
                  }}
                  style={{
                    background: isPresent ? "#fff8e1" : "#fff",
                    border: isPresent ? "2px solid #FFCA28" : "1px solid #eee",
                    borderRadius: 16,
                    padding: 16,
                    cursor: isFinished ? "not-allowed" : "pointer",
                    boxShadow: isPresent
                      ? "0 6px 16px rgba(255, 202, 40, 0.25)"
                      : "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={playerCardTopStyle}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlayer(player);
                      }}
                      style={presencePlayerButtonStyle}
                    >
                      <PlayerAvatar player={player} size={42} />
                      <div style={{ textAlign: "left" }}>
                        <strong style={{ color: "#b71c1c", fontSize: 18 }}>
                          {player.nickname}
                        </strong>
                        <div style={{ color: "#666", fontSize: 14 }}>
                          {player.name}
                        </div>
                      </div>
                    </button>

                    <div
                      style={{
                        background: hasLeftEarly
                          ? "#e0e0e0"
                          : isPresent
                          ? "#FFCA28"
                          : "#f5f5f5",
                        color: hasLeftEarly
                          ? "#555"
                          : isPresent
                          ? "#7a0000"
                          : "#777",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {hasLeftEarly ? "FOI EMBORA" : isPresent ? "PRESENTE" : "AUSENTE"}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, color: "#555", fontSize: 14 }}>
                    {player.role === "line" ? "Linha" : "Goleiro"} •{" "}
                    {player.participation === "official" ? "Oficial" : "Convidado"}
                    {player.overall ? ` • Nível ${player.overall}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ marginTop: 20 }}>
          <a href={`/sessions?groupId=${session.group_id}`}>Voltar para horários</a>
        </div>
      </div>
    </main>
  );
}

function TeamCard({
  title,
  players,
  onLeftEarly,
  onSelectPlayer,
}: {
  title: string;
  players: Player[];
  onLeftEarly: (playerId: string) => void;
  onSelectPlayer: (player: Player) => void;
}) {
  return (
    <div style={teamCardStyle}>
      <h3 style={{ marginTop: 0, color: "#b71c1c" }}>{title}</h3>

      {players.length === 0 ? (
        <p style={{ color: "#777" }}>Vazio</p>
      ) : (
        players.map((player, index) => (
          <div
            key={player.id}
            style={{
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
            }}
          >
            <button
              onClick={() => onSelectPlayer(player)}
              style={teamPlayerButtonStyle}
            >
              <PlayerAvatar player={player} size={32} />
              <span>
                {index + 1}. {player.nickname} — nível {player.overall ?? "-"}
              </span>
            </button>

            <button onClick={() => onLeftEarly(player.id)} style={smallDangerButton}>
              Foi embora
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function PlayerAvatar({ player, size = 36 }: { player: Player; size?: number }) {
  if (player.photo_url) {
    return (
      <img
        src={player.photo_url}
        alt={player.nickname}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid #FFCA28",
          background: "#fff",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fff",
        border: "2px solid #FFCA28",
        color: "#b71c1c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: Math.max(11, size * 0.35),
        flexShrink: 0,
      }}
    >
      {(player.nickname || player.name || "FC").slice(0, 2).toUpperCase()}
    </div>
  );
}

function PlayerProfileModal({
  player,
  isPresent,
  hasLeftEarly,
  onClose,
}: {
  player: Player;
  isPresent: boolean;
  hasLeftEarly: boolean;
  onClose: () => void;
}) {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginTop: 0, color: "#b71c1c" }}>Perfil do jogador</h2>

          <button onClick={onClose} style={closeButtonStyle}>
            Fechar
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            alignItems: "center",
            marginTop: 12,
            marginBottom: 18,
          }}
        >
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.nickname}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "4px solid #FFCA28",
                background: "#fff8e1",
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "#fff8e1",
                border: "4px solid #FFCA28",
                color: "#b71c1c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 34,
              }}
            >
              {(player.nickname || player.name || "FC").slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <div style={{ color: "#b71c1c", fontWeight: 900, fontSize: 26 }}>
              {player.nickname}
            </div>

            <div style={{ color: "#666", fontSize: 16, marginTop: 4 }}>
              {player.name}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <ProfileBadge label={player.role === "line" ? "Linha" : "Goleiro"} />
              <ProfileBadge
                label={player.participation === "official" ? "Oficial" : "Convidado"}
              />
              <ProfileBadge
                label={hasLeftEarly ? "Foi embora" : isPresent ? "Presente" : "Ausente"}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <ProfileRow label="Nível geral" value={String(player.overall ?? "-")} />
          <ProfileRow label="Ataque" value={String(player.attack ?? "-")} />
          <ProfileRow label="Defesa" value={String(player.defense ?? "-")} />
          <ProfileRow label="Intensidade" value={String(player.intensity ?? "-")} />
        </div>
      </div>
    </div>
  );
}

function ProfileBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        background: "#fff8e1",
        border: "1px solid #ffd54f",
        color: "#5d4037",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {label}
    </span>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        background: "#fff8e1",
        border: "1px solid #ffd54f",
        borderRadius: 12,
        padding: "11px 13px",
      }}
    >
      <span style={{ color: "#777", fontWeight: 800 }}>{label}</span>
      <strong style={{ color: "#b71c1c" }}>{value}</strong>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: "#fff8e1",
        border: "1px solid #ffd54f",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ color: "#777", fontWeight: 800, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: "#b71c1c", fontSize: 22, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function translateStatus(status: string) {
  if (status === "draft") return "Rascunho";
  if (status === "in_progress") return "Em andamento";
  if (status === "finished") return "Finalizado";
  return status;
}

function Badge({ label }: { label: string }) {
  return <span style={badgeStyle}>{label}</span>;
}

function MessageBox({ message }: { message: string }) {
  return (
    <div
      style={{
        marginBottom: 16,
        background: message.startsWith("Erro") ? "#fff0f0" : "#f1fff2",
        border: message.startsWith("Erro")
          ? "1px solid #ffb3b3"
          : "1px solid #b7e4b8",
        color: message.startsWith("Erro") ? "#b00020" : "#1b5e20",
        borderRadius: 12,
        padding: 12,
        fontWeight: 700,
      }}
    >
      {message}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #fff8e1 0%, #ffffff 100%)",
  padding: "32px 20px",
  fontFamily: "Arial, sans-serif",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FF2800 0%, #FF6A00 100%)",
  color: "#fff",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 10px 30px rgba(255, 40, 0, 0.25)",
  marginBottom: 24,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  padding: 24,
  border: "2px solid #ffe082",
  boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#b71c1c",
  fontSize: 26,
};

const primaryButton: React.CSSProperties = {
  background: "#FFCA28",
  color: "#7a0000",
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  background: "#fff",
  color: "#7a0000",
  border: "1px solid #FFCA28",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  background: "#fff",
  color: "#FF2800",
  border: "1px solid #FF2800",
  borderRadius: 12,
  padding: "12px 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const smallDangerButton: React.CSSProperties = {
  background: "#fff",
  color: "#FF2800",
  border: "1px solid #FF2800",
  borderRadius: 10,
  padding: "6px 10px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const closeButtonStyle: React.CSSProperties = {
  background: "#fff",
  color: "#FF2800",
  border: "1px solid #FF2800",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 240,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #ddd",
  fontSize: 15,
};

const badgeStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: 999,
  padding: "8px 12px",
  fontWeight: 800,
  fontSize: 13,
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  marginTop: 18,
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  background: "#fff8e1",
  border: "1px solid #ffd54f",
  borderRadius: 12,
  padding: "12px 14px",
  color: "#5d4037",
  cursor: "pointer",
  textAlign: "left",
};

const teamGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
  marginTop: 20,
};

const teamCardStyle: React.CSSProperties = {
  background: "#fff8e1",
  border: "1px solid #ffd54f",
  borderRadius: 14,
  padding: 14,
};

const teamPlayerButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "transparent",
  border: "none",
  padding: 0,
  color: "#111",
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14,
  flex: 1,
};

const queueRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  background: "#fff8e1",
  border: "1px solid #ffd54f",
  borderRadius: 12,
  padding: "12px 14px",
  fontWeight: 700,
};

const queuePlayerButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  background: "transparent",
  border: "none",
  padding: 0,
  color: "#111",
  cursor: "pointer",
  fontWeight: 800,
  textAlign: "left",
};

const presencePlayerButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 20,
};

const playersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 14,
};

const playerCardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 22,
  padding: 24,
  maxWidth: 560,
  width: "100%",
  border: "2px solid #FFCA28",
  boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
};

const modalInfoStyle: React.CSSProperties = {
  background: "#fff8e1",
  border: "1px solid #ffd54f",
  borderRadius: 12,
  padding: 12,
  color: "#5d4037",
  fontWeight: 700,
  lineHeight: 1.5,
};