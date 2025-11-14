// ====== 데이터 저장 구조 ======
let groups   = JSON.parse(localStorage.getItem("groups")   || "[]");
let members  = JSON.parse(localStorage.getItem("members")  || "[]");
let deposits = JSON.parse(localStorage.getItem("deposits") || "[]");
let expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
let donations = JSON.parse(localStorage.getItem("donations") || "[]");
let activeGroupId = Number(localStorage.getItem("activeGroupId") || 0);

// 초기 모임 없으면 하나 생성
if (!groups.length) {
  const gid = Date.now();
  groups.push({ id: gid, name: "여성선교회 2025년" });
  activeGroupId = gid;
  saveAll();
}

function saveAll() {
  localStorage.setItem("groups",   JSON.stringify(groups));
  localStorage.setItem("members",  JSON.stringify(members));
  localStorage.setItem("deposits", JSON.stringify(deposits));
  localStorage.setItem("expenses", JSON.stringify(expenses));
  localStorage.setItem("donations", JSON.stringify(donations));
  localStorage.setItem("activeGroupId", String(activeGroupId));
}

// ====== 공통 유틸 ======
function byGroup(arr) {
  const gId = activeGroupId;
  return arr.filter(x => x.groupId === gId || x.groupId === undefined);
}
function fmtMoney(v) {
  return (v || 0).toLocaleString() + "원";
}

// ====== 그룹 선택/추가 ======
function renderGroupSelect() {
  const sel = document.getElementById("groupSelect");
  if (!sel) return;
  sel.innerHTML = groups.map(g =>
    `<option value="${g.id}" ${g.id===activeGroupId?"selected":""}>${g.name}</option>`
  ).join("");
}
function changeGroup() {
  const sel = document.getElementById("groupSelect");
  activeGroupId = Number(sel.value);
  saveAll();
  renderAll();
}
function openGroupModal() {
  document.getElementById("groupName").value = "";
  openModal("groupModal");
}
function addGroup() {
  const name = document.getElementById("groupName").value.trim();
  if (!name) return alert("모임 이름을 입력하세요.");
  const id = Date.now();
  groups.push({id, name});
  activeGroupId = id;
  saveAll();
  closeModal("groupModal");
  renderAll();
}

// ====== 모달 공통 ======
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

// ====== 페이지 전환 ======
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  const target = document.getElementById(pageId);
  if (target) target.style.display = "block";

  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  const btnIdMap = {
    "membersPage": "btnMembersTab",
    "depositPage": "btnDepositTab",
    "donationPage": "btnDonationTab",
    "expensePage": "btnExpenseTab",
    "balancePage": "btnBalanceTab"
  };
  const tabId = btnIdMap[pageId];
  if (tabId) {
    const btn = document.getElementById(tabId);
    if (btn) btn.classList.add("active");
  }
  renderAll();
}

// FAB 동작: 현재 페이지에 따라 다르게
function handleFab() {
  const pages = ["membersPage","depositPage","donationPage","expensePage"];
  let current = "membersPage";
  for (const id of pages) {
    const el = document.getElementById(id);
    if (el && el.style.display !== "none") {
      current = id;
      break;
    }
  }
  if (current === "membersPage") {
    openMemberModal();
  } else if (current === "depositPage") {
    openDepositModal();
  } else if (current === "donationPage") {
    openDonationModal();
  } else if (current === "expensePage") {
    openExpenseModal();
  }
}

// ====== 회원 관리 ======
function openMemberModal(id = null) {
  document.getElementById("editingMemberId").value = id || "";
  document.getElementById("memberName").value = "";

  if (id) {
    const m = members.find(x => x.id === id);
    if (m) document.getElementById("memberName").value = m.name;
  }
  openModal("memberModal");
}
function saveMember() {
  const idStr = document.getElementById("editingMemberId").value;
  const name  = document.getElementById("memberName").value.trim();
  if (!name) return alert("회원 이름을 입력하세요.");

  if (idStr) {
    const id = Number(idStr);
    const idx = members.findIndex(m => m.id === id);
    if (idx > -1) members[idx].name = name;
  } else {
    members.push({ id: Date.now(), groupId: activeGroupId, name });
  }
  saveAll();
  closeModal("memberModal");
  renderAll();
}
function deleteMember(id) {
  const usedDep = deposits.some(d=>d.memberId===id);
  const usedExp = expenses.some(e=>e.members && e.members.includes(id));
  const usedDon = donations.some(d=>d.memberId===id);
  if (usedDep || usedExp || usedDon) {
    return alert("입금/지출/도네이션 기록이 있어 삭제할 수 없습니다.");
  }
  if (!confirm("정말 이 회원을 삭제하시겠습니까?")) return;
  members = members.filter(m => m.id !== id);
  saveAll();
  renderAll();
}
function renderMembersPage() {
  const container = document.getElementById("membersPage");
  const gm = byGroup(members);
  if (!gm.length) {
    container.innerHTML = `<div class="card">회원이 없습니다. 우측 하단 + 버튼으로 추가하세요.</div>`;
    return;
  }
  container.innerHTML = gm.map(m => `
    <div class="card">
      <div class="card-title">${m.name}</div>
      <div class="card-actions">
        <button onclick="openMemberModal(${m.id})">수정</button>
        <button onclick="deleteMember(${m.id})">삭제</button>
      </div>
    </div>
  `).join("");
}

// ====== 입금(회비) ======
function openDepositModal(id = null) {
  document.getElementById("editingDepositId").value = id || "";
  document.getElementById("depositAmount").value = "";
  document.getElementById("depositMemo").value = "";

  const sel = document.getElementById("depositMember");
  const gm = byGroup(members);
  sel.innerHTML = gm.map(m => `<option value="${m.id}">${m.name}</option>`).join("");

  if (id) {
    const d = deposits.find(x => x.id === id);
    if (d) {
      sel.value = d.memberId;
      document.getElementById("depositAmount").value = d.amount;
      document.getElementById("depositMemo").value = d.memo || "";
    }
  }
  openModal("depositModal");
}
function saveDeposit() {
  const idStr = document.getElementById("editingDepositId").value;
  const memberId = Number(document.getElementById("depositMember").value);
  const amount   = Number(document.getElementById("depositAmount").value);
  const memo     = document.getElementById("depositMemo").value.trim();

  if (!memberId || !amount) return alert("회원과 금액을 입력하세요.");

  if (idStr) {
    const id = Number(idStr);
    const idx = deposits.findIndex(d => d.id === id);
    if (idx > -1) {
      deposits[idx].memberId = memberId;
      deposits[idx].amount   = amount;
      deposits[idx].memo     = memo;
      deposits[idx].groupId  = activeGroupId;
    }
  } else {
    deposits.push({
      id: Date.now(),
      groupId: activeGroupId,
      memberId,
      amount,
      memo
    });
  }
  saveAll();
  closeModal("depositModal");
  renderAll();
}
function deleteDeposit(id) {
  if (!confirm("이 입금 기록을 삭제할까요?")) return;
  deposits = deposits.filter(d => d.id !== id);
  saveAll();
  renderAll();
}

// 빠른 입금: 회비 자동입금
function renderDepositQuick() {
  const container = document.getElementById("depositPage");
  const gm = byGroup(members);
  let html = `
    <div class="card no-print">
      <div class="card-title">빠른 입금 입력</div>
      <div class="card-sub">회원별 회비를 한 번에 입력합니다. 메모는 "회비 자동입금"으로 저장됩니다.</div>
  `;
  if (!gm.length) {
    html += `<div>먼저 회원을 추가해주세요.</div></div>`;
    container.innerHTML = html + `<div id="depositList"></div>`;
    return;
  }
  html += gm.map(m => `
    <div class="quick-card">
      <div class="quick-name">${m.name}</div>
      <div class="quick-row">
        <input type="number" inputmode="decimal" id="quickDeposit_${m.id}" placeholder="금액 (원)">
        <button onclick="quickAddDeposit(${m.id})">추가</button>
      </div>
    </div>
  `).join("");
  html += `</div><div id="depositList"></div>`;
  container.innerHTML = html;
}
function quickAddDeposit(memberId) {
  const input = document.getElementById("quickDeposit_" + memberId);
  if (!input) return;
  const val = Number(input.value);
  if (!val) return alert("금액을 입력하세요.");
  deposits.push({
    id: Date.now(),
    groupId: activeGroupId,
    memberId,
    amount: val,
    memo: "회비 자동입금"
  });
  input.value = "";
  saveAll();
  renderDepositList();
}
function renderDepositList() {
  const container = document.getElementById("depositList");
  if (!container) return;
  const gDep = byGroup(deposits);
  let html = `
    <div class="card no-print">
      <div class="card-title">입금 내역</div>
      <div class="card-sub">회원 회비 및 추가 입금 기록입니다.</div>
      <button class="secondary-btn" onclick="exportCSV('deposits')">입금 CSV 내보내기</button>
    </div>
  `;
  if (!gDep.length) {
    html += `<div class="card">입금 기록이 없습니다.</div>`;
  } else {
    html += gDep.map(d => {
      const m = members.find(x => x.id === d.memberId);
      const name = m ? m.name : "(탈퇴 회원)";
      return `
        <div class="card">
          <div class="card-title">${name} – ${fmtMoney(d.amount)}</div>
          <div class="card-sub">${d.memo ? "메모: " + d.memo : ""}</div>
          <div class="card-actions">
            <button onclick="openDepositModal(${d.id})">수정</button>
            <button onclick="deleteDeposit(${d.id})">삭제</button>
          </div>
        </div>
      `;
    }).join("");
  }
  container.innerHTML = html;
}
function renderDepositPage() {
  renderDepositQuick();
  renderDepositList();
}

// ====== 도네이션 ======
function openDonationModal(id = null) {
  document.getElementById("editingDonationId").value = id || "";
  document.getElementById("donationAmount").value = "";
  document.getElementById("donationMemo").value = "";

  const sel = document.getElementById("donationMember");
  const gm = byGroup(members);
  // 첫 번째 옵션: 무기명
  let opts = `<option value="none">무기명</option>`;
  opts += gm.map(m => `<option value="${m.id}">${m.name}</option>`).join("");
  sel.innerHTML = opts;

  if (id) {
    const d = donations.find(x => x.id === id);
    if (d) {
      sel.value = d.memberId ? String(d.memberId) : "none";
      document.getElementById("donationAmount").value = d.amount;
      document.getElementById("donationMemo").value = d.memo || "";
    }
  }
  openModal("donationModal");
}
function saveDonation() {
  const idStr = document.getElementById("editingDonationId").value;
  const memberSel = document.getElementById("donationMember").value;
  const amount = Number(document.getElementById("donationAmount").value);
  const memo   = document.getElementById("donationMemo").value.trim();

  if (!amount) return alert("금액을 입력하세요.");
  const memberId = memberSel === "none" ? null : Number(memberSel);

  if (idStr) {
    const id = Number(idStr);
    const idx = donations.findIndex(d => d.id === id);
    if (idx > -1) {
      donations[idx].memberId = memberId;
      donations[idx].amount   = amount;
      donations[idx].memo     = memo;
      donations[idx].groupId  = activeGroupId;
    }
  } else {
    donations.push({
      id: Date.now(),
      groupId: activeGroupId,
      memberId,
      amount,
      memo
    });
  }
  saveAll();
  closeModal("donationModal");
  renderAll();
}
function deleteDonation(id) {
  if (!confirm("이 도네이션 기록을 삭제할까요?")) return;
  donations = donations.filter(d => d.id !== id);
  saveAll();
  renderAll();
}

// 빠른 도네이션 입력
function renderDonationPage() {
  const container = document.getElementById("donationPage");
  const gm = byGroup(members);

  let html = `
    <div class="card no-print">
      <div class="card-title">빠른 도네이션 입력</div>
      <div class="card-sub">
        특정 회원 또는 무기명 도네이션을 빠르게 기록합니다.<br>
        • 회원 선택 시: 메모 "헌금 자동기록"<br>
        • 무기명 선택 시: 메모 "도네이션 자동기록"
      </div>
  `;

  // 무기명 카드
  html += `
    <div class="quick-card">
      <div class="quick-name">무기명</div>
      <div class="quick-row">
        <input type="number" inputmode="decimal" id="quickDonation_none" placeholder="금액 (원)">
        <button onclick="quickAddDonation('none')">추가</button>
      </div>
    </div>
  `;

  // 회원들 카드
  if (!gm.length) {
    html += `<div style="margin-top:6px;">회원이 없으면 개인 도네이션은 선택할 수 없습니다.</div>`;
  } else {
    html += gm.map(m => `
      <div class="quick-card">
        <div class="quick-name">${m.name}</div>
        <div class="quick-row">
          <input type="number" inputmode="decimal" id="quickDonation_${m.id}" placeholder="금액 (원)">
          <button onclick="quickAddDonation(${m.id})">추가</button>
        </div>
      </div>
    `).join("");
  }

  html += `</div><div id="donationList"></div>`;
  container.innerHTML = html;
  renderDonationList();
}
function quickAddDonation(memberKey) {
  const inputId = "quickDonation_" + memberKey;
  const input = document.getElementById(inputId);
  if (!input) return;
  const val = Number(input.value);
  if (!val) return alert("금액을 입력하세요.");

  let memberId = null;
  let memo = "";
  if (memberKey === 'none') {
    memo = "도네이션 자동기록";
  } else {
    memberId = Number(memberKey);
    memo = "헌금 자동기록";
  }

  donations.push({
    id: Date.now(),
    groupId: activeGroupId,
    memberId,
    amount: val,
    memo
  });
  input.value = "";
  saveAll();
  renderDonationList();
}
function renderDonationList() {
  const container = document.getElementById("donationList");
  if (!container) return;
  const gDon = byGroup(donations);

  let html = `
    <div class="card no-print">
      <div class="card-title">도네이션 내역</div>
      <div class="card-sub">헌금 및 무기명 도네이션 기록입니다.</div>
      <button class="secondary-btn" onclick="exportCSV('donations')">도네이션 CSV 내보내기</button>
    </div>
  `;
  if (!gDon.length) {
    html += `<div class="card">도네이션 기록이 없습니다.</div>`;
  } else {
    html += gDon.map(d => {
      const m = d.memberId ? members.find(x => x.id === d.memberId) : null;
      const name = m ? m.name : "무기명";
      return `
        <div class="card">
          <div class="card-title">${name} – ${fmtMoney(d.amount)}</div>
          <div class="card-sub">${d.memo ? "메모: " + d.memo : ""}</div>
          <div class="card-actions">
            <button onclick="openDonationModal(${d.id})">수정</button>
            <button onclick="deleteDonation(${d.id})">삭제</button>
          </div>
        </div>
      `;
    }).join("");
  }
  container.innerHTML = html;
}

// ====== 지출 ======
function openExpenseModal(id = null) {
  document.getElementById("editingExpenseId").value = id || "";
  document.getElementById("expenseAmount").value = "";
  document.getElementById("expenseMemo").value = "";

  const container = document.getElementById("expenseMembers");
  const gm = byGroup(members);
  container.innerHTML = gm.map(m => `
    <label>
      <input type="checkbox" class="exp-check" value="${m.id}">
      ${m.name}
    </label>
  `).join("");

  if (id) {
    const e = expenses.find(x => x.id === id);
    if (e) {
      document.getElementById("expenseAmount").value = e.amount;
      document.getElementById("expenseMemo").value = e.memo || "";
      e.members.forEach(mid => {
        const cb = container.querySelector('input[value="' + mid + '"]');
        if (cb) cb.checked = true;
      });
    }
  }
  openModal("expenseModal");
}
function saveExpense() {
  const idStr = document.getElementById("editingExpenseId").value;
  const amount = Number(document.getElementById("expenseAmount").value);
  const memo   = document.getElementById("expenseMemo").value.trim();
  const selected = Array.from(document.querySelectorAll(".exp-check:checked"))
                        .map(x => Number(x.value));

  if (!amount || !selected.length) return alert("금액과 참여자를 선택하세요.");
  const share = Math.round(amount / selected.length);

  if (idStr) {
    const id = Number(idStr);
    const idx = expenses.findIndex(e => e.id === id);
    if (idx > -1) {
      expenses[idx].amount  = amount;
      expenses[idx].memo    = memo;
      expenses[idx].members = selected;
      expenses[idx].share   = share;
      expenses[idx].groupId = activeGroupId;
    }
  } else {
    expenses.push({
      id: Date.now(),
      groupId: activeGroupId,
      amount,
      memo,
      members: selected,
      share
    });
  }
  saveAll();
  closeModal("expenseModal");
  renderAll();
}
function deleteExpense(id) {
  if (!confirm("이 지출 기록을 삭제할까요?")) return;
  expenses = expenses.filter(e => e.id !== id);
  saveAll();
  renderAll();
}
function renderExpensePage() {
  const container = document.getElementById("expensePage");
  const gExp = byGroup(expenses);
  let html = `
    <div class="card no-print">
      <div class="card-title">지출 내역</div>
      <div class="card-sub">모임비 사용 내역과 참석자를 기록합니다.</div>
      <button class="secondary-btn" onclick="exportCSV('expenses')">지출 CSV 내보내기</button>
    </div>
  `;
  if (!gExp.length) {
    html += `<div class="card">지출 기록이 없습니다. 우측 하단 + 버튼으로 추가하세요.</div>`;
  } else {
    html += gExp.map(e => {
      const names = e.members.map(id => {
        const m = members.find(mm => mm.id === id);
        return m ? m.name : "";
      }).join(", ");
      return `
        <div class="card">
          <div class="card-title">${e.memo || "지출"} – 총 ${fmtMoney(e.amount)}</div>
          <div class="card-sub">1인 부담: ${fmtMoney(e.share)}</div>
          <div style="font-size:14px;">참여: ${names}</div>
          <div class="card-actions">
            <button onclick="openExpenseModal(${e.id})">수정</button>
            <button onclick="deleteExpense(${e.id})">삭제</button>
          </div>
        </div>
      `;
    }).join("");
  }
  container.innerHTML = html;
}

// ====== 정산 ======
function calcBalances() {
  const gId = activeGroupId;
  const gm = byGroup(members);
  return gm.map(m => {
    const dep = byGroup(deposits)
      .filter(d => d.memberId === m.id)
      .reduce((a,b) => a + (b.amount || 0), 0);
    const share = byGroup(expenses)
      .map(e => e.members && e.members.includes(m.id) ? e.share : 0)
      .reduce((a,b) => a + b, 0);
    return { name: m.name, balance: dep - share };
  });
}
function renderBalancePage() {
  const container = document.getElementById("balancePage");
  const bal = calcBalances();
  const gDep = byGroup(deposits);
  const gExp = byGroup(expenses);
  const gDon = byGroup(donations);

  const totalDeposit = gDep.reduce((a,b)=>a+(b.amount||0),0);
  const totalExpense = gExp.reduce((a,b)=>a+(b.amount||0),0);
  const totalDonation = gDon.reduce((a,b)=>a+(b.amount||0),0);
  const anonDonation = gDon
    .filter(d => !d.memberId)
    .reduce((a,b)=>a+(b.amount||0),0);

  let html = `
    <div class="card no-print">
      <div class="card-title">모임 요약</div>
      <div class="summary-row"><span>총 입금(회비 등)</span><span>${fmtMoney(totalDeposit)}</span></div>
      <div class="summary-row"><span>총 지출</span><span>${fmtMoney(totalExpense)}</span></div>
      <div class="summary-row"><span>회비 잔액</span><span>${fmtMoney(totalDeposit - totalExpense)}</span></div>
      <div class="summary-row" style="margin-top:8px;"><span>총 도네이션</span><span>${fmtMoney(totalDonation)}</span></div>
      <div class="summary-row"><span>무기명 도네이션</span><span>${fmtMoney(anonDonation)}</span></div>
      <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
        <button class="secondary-btn" style="flex:1;" onclick="exportCSV('balances')">정산 CSV</button>
        <button class="secondary-btn" style="flex:1;" onclick="window.print()">인쇄</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">회원별 정산 (입금 - 부담액)</div>
      <div style="font-size:15px;margin-top:6px;">
        ${
          bal.length
            ? bal.map(b => `${b.name}: ${fmtMoney(b.balance)}`).join("<br>")
            : "회원이 없습니다."
        }
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ====== CSV / 백업 ======
function exportCSV(type) {
  const gId = activeGroupId;
  let csv = "";
  if (type === "deposits") {
    csv += "member,amount,memo\n";
    byGroup(deposits).forEach(d => {
      const m = members.find(x => x.id === d.memberId);
      const name = m ? m.name.replace(/"/g,'""') : "";
      const memo = (d.memo || "").replace(/"/g,'""');
      csv += `"${name}",${d.amount},"${memo}"\n`;
    });
  } else if (type === "expenses") {
    csv += "memo,amount,share,participants\n";
    byGroup(expenses).forEach(e => {
      const memo = (e.memo || "").replace(/"/g,'""');
      const names = (e.members || []).map(id => {
        const m = members.find(mm=>mm.id===id);
        return m ? m.name : "";
      }).join(";").replace(/"/g,'""');
      csv += `"${memo}",${e.amount},${e.share},"${names}"\n`;
    });
  } else if (type === "balances") {
    const bal = calcBalances();
    csv += "member,balance\n";
    bal.forEach(b => {
      const name = b.name.replace(/"/g,'""');
      csv += `"${name}",${b.balance}\n`;
    });
  } else if (type === "donations") {
    csv += "member,amount,memo\n";
    byGroup(donations).forEach(d => {
      const m = d.memberId ? members.find(x => x.id === d.memberId) : null;
      const name = (m ? m.name : "무기명").replace(/"/g,'""');
      const memo = (d.memo || "").replace(/"/g,'""');
      csv += `"${name}",${d.amount},"${memo}"\n`;
    });
  } else {
    return;
  }
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `moim_${type}_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportBackup() {
  const data = { groups, members, deposits, expenses, donations, activeGroupId };
  const blob = new Blob([JSON.stringify(data)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `moim_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function importBackup() {
  document.getElementById("backupFile").value = "";
  document.getElementById("backupFile").click();
}
function handleBackupFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      groups    = data.groups   || [];
      members   = data.members  || [];
      deposits  = data.deposits || [];
      expenses  = data.expenses || [];
      donations = data.donations || [];
      activeGroupId = data.activeGroupId || (groups[0] && groups[0].id) || 0;
      saveAll();
      renderAll();
      alert("복원 완료!");
    } catch (err) {
      alert("복원 실패. 파일 형식을 확인하세요.");
    }
  };
  reader.readAsText(file, "utf-8");
}

// ====== 전체 렌더 ======
function renderAll() {
  renderGroupSelect();
  renderMembersPage();
  renderDepositPage();
  renderDonationPage();
  renderExpensePage();
  renderBalancePage();
}

// ====== 초기 설정 ======
window.addEventListener("load", () => {
  // 이벤트 바인딩
  document.getElementById("groupSelect").addEventListener("change", changeGroup);
  document.getElementById("btnAddGroup").addEventListener("click", openGroupModal);
  document.getElementById("saveGroupBtn").addEventListener("click", addGroup);

  document.getElementById("btnExportBackup").addEventListener("click", exportBackup);
  document.getElementById("btnImportBackup").addEventListener("click", importBackup);
  document.getElementById("backupFile").addEventListener("change", handleBackupFile);

  document.getElementById("saveMemberBtn").addEventListener("click", saveMember);
  document.getElementById("saveDepositBtn").addEventListener("click", saveDeposit);
  document.getElementById("saveDonationBtn").addEventListener("click", saveDonation);
  document.getElementById("saveExpenseBtn").addEventListener("click", saveExpense);

  document.querySelectorAll(".modal .secondary-btn[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      closeModal(btn.getAttribute("data-close"));
    });
  });

  document.getElementById("btnMembersTab").addEventListener("click", () => showPage("membersPage"));
  document.getElementById("btnDepositTab").addEventListener("click", () => showPage("depositPage"));
  document.getElementById("btnDonationTab").addEventListener("click", () => showPage("donationPage"));
  document.getElementById("btnExpenseTab").addEventListener("click", () => showPage("expensePage"));
  document.getElementById("btnBalanceTab").addEventListener("click", () => showPage("balancePage"));

  document.getElementById("fabButton").addEventListener("click", handleFab);

  // 기본 페이지
  showPage("membersPage");
});

// 전역에서 호출 가능한 함수 노출 (onclick용)
window.openMemberModal = openMemberModal;
window.openDepositModal = openDepositModal;
window.deleteDeposit = deleteDeposit;
window.openDonationModal = openDonationModal;
window.deleteDonation = deleteDonation;
window.openExpenseModal = openExpenseModal;
window.deleteExpense = deleteExpense;
window.quickAddDeposit = quickAddDeposit;
window.quickAddDonation = quickAddDonation;
