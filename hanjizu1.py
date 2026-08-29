import streamlit as st
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import math

# --- 1. 仕上げ素材マスタ ---
MATERIAL_OPTS = {
    "仕上げ無し": 0.0,
    "メラミン": 1.0,
    "ポリ板 (2.5mm)": 2.5,
    "ポリ板 (4.0mm)": 4.0,
    "シナベニヤ / 突板": "input",
    "木口テープ": 0.5
}

# --- 2. UI（サイドバー） ---
with st.sidebar:
    st.header("1. 製作サイズ設定")
    W = st.number_input("仕上がり巾 (W)", value=2000.0)
    D = st.number_input("仕上がり奥行 (D)", value=1000.0)
    H = st.number_input("仕上がり高さ (H)", value=150.0)
    
    st.header("2. 仕上げ設定")
    
    # 長手（前後）の仕上げ
    finish_long = st.selectbox("長手（前後）の仕上げ", list(MATERIAL_OPTS.keys()), index=1)
    t_long = 0.0
    if MATERIAL_OPTS[finish_long] == "input":
        t_long = st.number_input("長手ベニヤ厚み (mm)", value=3.0, step=0.1)
    else:
        t_long = MATERIAL_OPTS[finish_long]

    # 短手（左右）の仕上げ
    finish_short = st.selectbox("短手（左右）の仕上げ", list(MATERIAL_OPTS.keys()), index=1)
    t_short = 0.0
    if MATERIAL_OPTS[finish_short] == "input":
        t_short = st.number_input("短手ベニヤ厚み (mm)", value=3.0, step=0.1)
    else:
        t_short = MATERIAL_OPTS[finish_short]

    st.header("3. 木取り・在庫設定")
    stype = st.radio("使用する下地材サイズ", ["3x6板", "4x8板"])
    SHEET_KEY = "3x6" if "3x6" in stype else "4x8"
    LUMBER_T = st.number_input("天板厚み (mm)", value=15.0)
    SOKKAN_MARGIN = 10.0 # 速乾ヨトリ

# --- ロジック計算 ---
def calculate_project():
    vw, vh = S_DEF["w"] - MARGIN, S_DEF["h"] - MARGIN
    
    # メラミン厚による下地寸法補正
    adj_w = W - (MELAMINE_T * 2)
    adj_d = D - (MELAMINE_T * 2)
    side_h = H - LUMBER_T # 天板勝ち
    
    # 1. 下地部材生成
    parts = []
    # 天板 (T字継ぎ)
    if adj_w > vw or adj_d > vh:
        rem_l, rem_d = adj_w - PRIMARY_L, adj_d - PRIMARY_D
        parts += [
            {"n": "天板A(主)", "l": PRIMARY_L, "d": PRIMARY_D},
            {"n": "天板B(巾残)", "l": PRIMARY_L, "d": rem_d},
            {"n": "天板C(ｴﾝﾄﾞ)", "l": adj_d, "d": rem_l} # 木目に沿わせるためL/Dを入れ替え
        ]
    else:
        parts.append({"n": "天板(一枚物)", "l": adj_w, "d": adj_d})
    
    # 前後枠
    if adj_w > vw:
        parts.append({"n": "前枠a", "l": PRIMARY_L, "d": side_h})
        parts.append({"n": "前枠b", "l": adj_w - PRIMARY_L, "d": side_h})
        parts.append({"n": "後枠a", "l": PRIMARY_L, "d": side_h})
        parts.append({"n": "後枠b", "l": adj_w - PRIMARY_L, "d": side_h})
    else:
        parts += [{"n": "前枠", "l": adj_w, "d": side_h}, {"n": "後枠", "l": adj_w, "d": side_h}]
    
    # 骨材 (在庫除外対応)
    if not exclude_cores:
        for i in range(7):
            parts.append({"n": f"骨材{i+1}", "l": adj_d - (LUMBER_T * 2), "d": side_h})

    # 3x6の巾制限チェックとネッティング
    final_parts = []
    for p in parts:
        if p["d"] > vh: # エンド等が巾910を超えた場合
            final_parts.append({"n": p["n"]+"(巾a)", "l": p["l"], "d": vh - KERF})
            final_parts.append({"n": p["n"]+"(巾b)", "l": p["l"], "d": p["d"] - (vh - KERF)})
        else: final_parts.append(p)

    final_parts.sort(key=lambda x: (x['l'], x['d']), reverse=True)
    sheets = []
    def pack(p):
        for s in sheets:
            for r in s['rows']:
                if r['h'] >= p['d'] and (vw - r['used_w']) >= p['l']:
                    r['parts'].append({'n': p['n'], 'x': r['used_w'], 'y': r['y'], 'w': p['l'], 'h': p['d']})
                    r['used_w'] += p['l'] + KERF; return True
            if (vh - s['used_h']) >= p['d']:
                s['rows'].append({'y': s['used_h'], 'h': p['d'], 'used_w': p['l'] + KERF, 
                                  'parts': [{'n': p['n'], 'x': 0, 'y': s['used_h'], 'w': p['l'], 'h': p['d']}]})
                s['used_h'] += p['d'] + KERF; return True
        return False
    for p in final_parts:
        if not pack(p):
            sheets.append({'id': len(sheets)+1, 'used_h': p['d'] + KERF, 
                           'rows': [{'y': 0, 'h': p['d'], 'used_w': p['l'] + KERF, 
                                     'parts': [{'n': p['n'], 'x': 0, 'y': 0, 'w': p['l'], 'h': p['d']}]}]})
    return sheets, adj_w, adj_d

# --- 描画関数 ---
def draw_results(sheets, aw, ad):
    for s in sheets:
        fig, ax = plt.subplots(figsize=(15, 8))
        sw, sh = S_DEF["w"], S_DEF["h"]
        ax.set_xlim(0, sw); ax.set_ylim(0, sh); ax.set_aspect('equal')
        ax.add_patch(patches.Rectangle((0,0), sw, sh, fc='#fdf5e6', ec='#8b4513', lw=2))
        st.subheader(f"下地材：{SHEET_KEY} ID:{s['id']}")
        
        used_max_h = s['used_h']
        for r in s['rows']:
            for p in r['parts']:
                ax.add_patch(patches.Rectangle((p['x'],p['y']), p['w'], p['h'], lw=1.5, ec='black', fc='#deb887', alpha=0.9))
                ax.text(p['x']+p['w']/2, p['y']+p['h']/2, f"{p['n']}\n{int(p['w'])}x{int(p['h'])}", ha='center', va='center', fontsize=12, fontweight='bold')
        
        # 端材参考表示
        rem_h = sh - used_max_h
        if rem_h > 30:
            ax.text(sw/2, sh - rem_h/2, f"端材参考：{int(sw)} x {int(rem_h)}", fontsize=15, color='darkred', ha='center', fontweight='bold', alpha=0.5)
        st.pyplot(fig)

    if MELAMINE_FINISH:
        st.subheader("仕上げ材：メラミン 4x8板 (ヨトリ10mm込)")
        fig_m, ax_m = plt.subplots(figsize=(15, 6))
        ax_m.set_xlim(0, 2424); ax_m.set_ylim(0, 1212); ax_m.set_aspect('equal')
        ax_m.add_patch(patches.Rectangle((0,0), 2424, 1212, fc='#e3f2fd', ec='#1e88e5', lw=2))
        mw, mh = 2000 + SOKKAN_MARGIN, 150 + SOKKAN_MARGIN
        mw_s = 1000 + SOKKAN_MARGIN
        # 並列配置
        m_parts = [
            (0, 0, mw, mh, "M前(ﾖﾄﾘ)"), (0, mh+3, mw, mh, "M後(ﾖﾄﾘ)"),
            (0, (mh+3)*2, mw_s, mh, "M左(ﾖﾄﾘ)"), (mw_s+3, (mh+3)*2, mw_s, mh, "M右(ﾖﾄﾘ)")
        ]
        for mx, my, mw_p, mh_p, mn in m_parts:
            ax_m.add_patch(patches.Rectangle((mx, my), mw_p, mh_p, lw=1.5, ec='blue', fc='#90caf9', alpha=0.9))
            ax_m.text(mx+mw_p/2, my+mh_p/2, f"{mn}\n{int(mw_p)}x{int(mh_p)}", ha='center', va='center', fontsize=12, fontweight='bold')
        st.pyplot(fig_m)

# --- 実行と表示 ---
sheets, aw, ad = calculate_project()
draw_results(sheets, aw, ad)

st.divider()
st.header("積算見積明細")
col1, col2 = st.columns(2)
l_count = len(sheets)
l_total = l_count * PRICES[SHEET_KEY]
m_total = PRICES["4x8_melamine"] if MELAMINE_FINISH else 0

with col1:
    st.write(f"**1. 下地ランバー ({SHEET_KEY})**")
    st.write(f"単価 {PRICES[SHEET_KEY]:,}円 × {l_count}枚")
    st.write(f"**小計：{l_total:,}円**")

with col2:
    if MELAMINE_FINISH:
        st.write("**2. 仕上げメラミン (4x8)**")
        st.write(f"単価 8,000円 × 1枚")
        st.write(f"**小計：8,000円**")

st.info(f"### 材料費合計：{l_total + m_total:,}円 (税込参考)")
st.warning("無駄のない木取りを提示しています。発注は余裕をもってください。ベニヤ継ぎ目下地は含まれていません。")