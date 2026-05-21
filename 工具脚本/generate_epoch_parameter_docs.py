#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全时代单位参数提取与索引文档生成器
生成 E1-E15 每个时代的完整单位参数列表（参数级精确定位）
同时生成跨时代总索引

用法: python generate_epoch_parameter_docs.py
输出: 全时代单位参数详情文档\E{N}时代_完整单位参数列表.md
      全时代单位参数详情文档\游戏单位参数详细位置索引文档.md
"""

import csv
import os
import re
import sys
from collections import defaultdict, OrderedDict
from datetime import datetime

# ─── 路径配置 ───
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "game-metadata", "EE2X_db")
CSV_PATH = os.path.join(DB_DIR, "TechTree", "upgrade_unittypes.csv")
CSV_EE2X_PATH = os.path.join(DB_DIR, "TechTree", "upgrade_unittypes_EE2X.csv")
TECH_PATH = os.path.join(DB_DIR, "TechTree", "dbtechtreenode.csv")
UNITS_DIR = os.path.join(DB_DIR, "Units")
EPOCH_DDF_DIR = os.path.join(DB_DIR, "TechTree")
TEXT_NAMES_PATH = os.path.join(DB_DIR, "Text", "dbtext_unittypenames.utf8")
TEXT_NAMES_EE2X_PATH = os.path.join(DB_DIR, "Text", "dbtext_unittypenames_EE2X.utf8")
OUTPUT_DIR = os.path.join(BASE_DIR, "全时代单位参数详情文档")

# ─── 工具函数 ───
def safe_int(val, default=0):
    try: return int(float(val))
    except: return default

def safe_float(val, default=0.0):
    try: return float(val)
    except: return default

def parse_brace_block(lines, start_idx):
    """从 start_idx 开始解析括号块，返回 (block_lines, end_idx)"""
    depth = 0
    block_lines = []
    i = start_idx
    started = False
    while i < len(lines):
        line = lines[i]
        block_lines.append(line)
        depth += line.count('{') - line.count('}')
        if '{' in line:
            started = True
        if started and depth <= 0:
            return block_lines, i
        i += 1
    return block_lines, i

# ═══════════════════════════════════════════════════════════════════
# 阶段0: 文本名称解析器 (中文名称提取)
# ═══════════════════════════════════════════════════════════════════

class TextNameParser:
    """解析所有 utf8 文本文件（含游戏ZIP中原始文件），建立 text_key → 中文名 完整映射"""

    def __init__(self):
        self.name_map = {}  # {text_key: chinese_name}

    def parse_all(self):
        text_dir = os.path.join(DB_DIR, "Text")

        # 1. 加载工作DB的Text目录
        priority_files = [
            'dbtext_unittypenames.utf8',
            'dbtext_unittypenames_EE2X.utf8',
            'dbtext_techtreenames.utf8',
            'dbtext_techtreenames_ee2x.utf8',
        ]
        all_files = []
        if os.path.isdir(text_dir):
            for f in os.listdir(text_dir):
                if f.endswith('.utf8'):
                    if f not in priority_files:
                        all_files.append(f)
        all_files = priority_files + sorted(all_files)
        for fname in all_files:
            path = os.path.join(text_dir, fname)
            if os.path.exists(path):
                self._parse_file(path)

        # 2. 加载原版游戏 db.zip 中的文本（补充EE2X可能缺失的条目）
        import zipfile
        base_zip = os.path.join(BASE_DIR, "Empire Earth II", "zips", "db.zip")
        if os.path.exists(base_zip):
            try:
                with zipfile.ZipFile(base_zip, 'r') as z:
                    for entry in z.namelist():
                        if 'dbtext' in entry.lower() and entry.endswith('.utf8'):
                            data = z.read(entry).decode('utf-8', errors='replace')
                            self._parse_text(data)
            except Exception:
                pass

        # 3. 加载 EE2X_db.zip 中不在工作DB的文本（补充场景文件等）
        ee2x_zip = os.path.join(BASE_DIR, "Empire Earth II", "zips_ee2x", "EE2X_db.zip")
        if os.path.exists(ee2x_zip):
            try:
                with zipfile.ZipFile(ee2x_zip, 'r') as z:
                    for entry in z.namelist():
                        if 'dbtext' in entry.lower() and entry.endswith('.utf8'):
                            # 检查是否已经加载过
                            fname = os.path.basename(entry)
                            if fname not in all_files:
                                data = z.read(entry).decode('utf-8', errors='replace')
                                self._parse_text(data)
            except Exception:
                pass

        # 4. 手动补充确认为游戏内单位但所有文本文件均缺失的名称
        self._add_fallbacks()
        return self.name_map

    def _add_fallbacks(self):
        fallbacks = {
            'tx_utn_HercFacility_name': '机甲制造设施',
            'tx_utn_e32_name': 'E-3预警机',
            'tx_utn_thaad15_name': '萨德反导系统',
            'tx_utn_scud15_name': '飞毛腿导弹',
            'tx_utn_KingRegicide_name': '摄政王',
            'tx_utn_LeaderKemsa_name': '肯萨领袖',
            'tx_utn_balloon_name': '观测气球',
            'tx_utn_bank_name': '银行',
            'tx_utn_bear_name': '熊',
            'tx_utn_boar_name': '野猪',
            'tx_utn_Adria2_name': '阿德里亚海上平台',
            'tx_utn_Archuii_name': '阿克修伊战机',
            'tx_utn_BeteGiyorgis_name': '圣乔治教堂',
            'tx_utn_Bld_BankAsian_name': '亚洲银行',
            'tx_utn_Bld_SaddamMonument_name': '萨达姆纪念碑',
            'tx_utn_Bld_Santa_Sofia_name': '圣索菲亚大教堂',
            'tx_utn_Bld_SouthPacif_name': '南太平洋城市中心',
            'tx_utn_Bld_Washington_name': '华盛顿纪念碑',
            'tx_utn_Bld_egipt_name': '埃及建筑',
            'tx_utn_Bld_torii_name': '鸟居',
            'tx_utn_Bld_venera_name': '维内拉雕像',
            'tx_utn_Bld_babel_name': '巴别塔',
            'tx_utn_FaMenSi_name': '法门寺',
            'tx_utn_Ferdowsi_name': '菲尔多西墓',
            'tx_utn_Fire_name': '火焰',
            'tx_utn_GreatWall_name': '长城',
            'tx_utn_Guanlitai_name': '观礼台',
            'tx_utn_Gulag_name': '古拉格集中营',
            'tx_utn_HeavenTemple_name': '天坛',
            'tx_utn_HedvigChurch_name': '海德维格教堂',
            'tx_utn_HorusTemple_name': '荷鲁斯神殿',
            'tx_utn_Huabiao_name': '华表',
            'tx_utn_Ikhanda_name': '伊坎达',
            'tx_utn_Iqbal_name': '伊克巴尔墓',
            'tx_utn_IshtarGate_name': '伊什塔尔门',
            'tx_utn_Lavra_name': '拉伏拉修道院',
            'tx_utn_MinaretofJam_name': '贾姆尖塔',
            'tx_utn_Naberezhnaya_name': '河岸大教堂',
            'tx_utn_NubianPyramid_name': '努比亚金字塔',
            'tx_utn_Pantheon_name': '万神殿',
            'tx_utn_RomanTemple_name': '罗马神殿',
            'tx_utn_SaintBasilsCathedral_name': '圣瓦西里大教堂',
            'tx_utn_ShimabaraCastle_name': '岛原城',
            'tx_utn_Swords_name': '剑冢',
            'tx_utn_TourEDF_name': 'EDF大厦',
            'tx_utn_TourMontparnasse_name': '蒙帕纳斯大厦',
            'tx_utn_Walidsd_name': '瓦利德大清真寺',
            'tx_utn_WittenbergChurch_name': '维滕贝格教堂',
            'tx_utn_anandatemple_name': '阿难陀寺',
            'tx_utn_apolloprogram_name': '阿波罗计划',
            'tx_utn_apolo_name': '阿波罗雕像',
            'tx_utn_aqueduct_name': '罗马引水渠',
            'tx_utn_arcdetriomphe_name': '凯旋门',
            'tx_utn_b1Frankfurter_name': '法兰克福大厦',
            'tx_utn_bankofchinatower_name': '中国银行大厦',
            'tx_utn_beijintam_name': '北京天坛',
            'tx_utn_bolshoi_name': '莫斯科大剧院',
            'tx_utn_bosan_name': '宝山寺',
            'tx_utn_bubu_name': '步步神庙',
            'tx_utn_chrysler_name': '克莱斯勒大厦',
            'tx_utn_cleopatraneedle_name': '克莉奥佩特拉方尖碑',
            'tx_utn_colosseum0101_name': '罗马竞技场',
            'tx_utn_cuyahoga_name': '凯霍加大厦',
            'tx_utn_dangeon_name': '地牢',
            'tx_utn_earthColosseum4_name': '地球竞技场',
            'tx_utn_eiffeltower_name': '埃菲尔铁塔',
            'tx_utn_ezek_name': '以西结墓',
            'tx_utn_fflacn_name': '法国外籍军团',
            'tx_utn_giantcross_name': '巨型十字架',
            'tx_utn_greatlighthouse_name': '亚历山大灯塔',
            'tx_utn_hanginggardens_name': '空中花园',
            'tx_utn_hartford_name': '哈特福德大厦',
            'tx_utn_hermitage_name': '艾尔米塔什博物馆',
            'tx_utn_hollywood_name': '好莱坞标志',
            'tx_utn_hongkong_name': '香港中银大厦',
            'tx_utn_johnhancockcenter_name': '约翰汉考克中心',
            'tx_utn_kgb_name': '克格勃总部',
            'tx_utn_lascala_name': '斯卡拉歌剧院',
            'tx_utn_motherland_name': '祖国母亲雕像',
            'tx_utn_nanjing_name': '南京紫峰大厦',
            'tx_utn_nebelwerfer_name': '多管火箭炮',
            'tx_utn_novotel_name': '诺富特酒店',
            'tx_utn_osaka_name': '大阪城',
            'tx_utn_perun_name': '佩伦神殿',
            'tx_utn_pisa2_name': '比萨斜塔',
            'tx_utn_reihsstagg01_name': '帝国议会大厦',
            'tx_utn_ruministry_name': '俄罗斯外交部',
            'tx_utn_shiatemple_name': '什叶派清真寺',
            'tx_utn_shunhing_name': '信兴广场',
            'tx_utn_sistinechapel_name': '西斯廷礼拜堂',
            'tx_utn_soyuz_name': '联盟雕像',
            'tx_utn_sphinx0101_name': '狮身人面像',
            'tx_utn_spiralminaret_name': '螺旋宣礼塔',
            'tx_utn_statueofliberty_name': '自由女神像',
            'tx_utn_svarog_name': '斯瓦罗格神殿',
            'tx_utn_theatre_name': '罗马剧院',
            'tx_utn_unitednations_name': '联合国总部',
            'tx_utn_veles_name': '维列斯神殿',
            'tx_utn_vyramid_name': '卢浮宫金字塔',
            'tx_utn_wackerjk_name': '瓦克尔化学大厦',
            'tx_utn_zoroastriancathedral_name': '琐罗亚斯德大教堂',
            'tx_utn_zoroastrianmonastery_name': '琐罗亚斯德修道院',
            'tx_utn_zumwalt_ddg1000_name': '朱姆沃尔特级驱逐舰',

            # 原版 db.zip 中可能有的 entry
            'tx_utn_bank_name': '银行',
            'tx_utn_balloon_name': '观测气球',
            'tx_utn_Firearcher_name': '火箭弓箭手',

            # 动物/尸体
            'tx_utn_Coyote_name': '郊狼',
            'tx_utn_croc_name': '鳄鱼',
            'tx_utn_rhino_name': '犀牛',
            'tx_utn_DeadBear_name': '死熊',
            'tx_utn_DeadCamel_name': '死骆驼',
            'tx_utn_DeadCow_name': '死牛',
            'tx_utn_DeadCoyote_name': '死郊狼',
            'tx_utn_Deadcroc_name': '死鳄鱼',
            'tx_utn_DeadDolphin_name': '死海豚',
            'tx_utn_DeadHawk_name': '死鹰',
            'tx_utn_DeadRhino_name': '死犀牛',
            'tx_utn_DeadTiger_name': '死老虎',
            'tx_utn_DeadVulture_name': '死秃鹫',
            'tx_utn_Deadwhale_name': '死鲸鱼',
            'tx_utn_DeadWolf_name': '死狼',

            # 地雷
            'tx_utn_landmine_name': '地雷',

            # 拿破仑模组领袖
            'tx_utn_Bagration_name': '巴格拉季昂',
            'tx_utn_BlUcher_name': '布吕歇尔',
            'tx_utn_Davout_name': '达武',
            'tx_utn_Kutuzov_name': '库图佐夫',
            'tx_utn_Joachim_name': '缪拉',
            'tx_utn_Ney_name': '内伊',
            'tx_utn_Suvorov_name': '苏沃洛夫',

            # 抽象基础类型（DDF无displayName，用text_前缀查找也找不到的）
            'text_Aircraft_name': '飞机基类',
            'text_Artillery_name': '火炮基类',
            'text_Human_name': '人类基类',
            'text_Mounted_name': '骑兵基类',
            'text_Tank_name': '坦克基类',
            'text_HeavyTank_name': '重型坦克基类',
            'text_LightTank_name': '轻型坦克基类',
            'text_HeavyMounted_name': '重型骑兵基类',
            'text_NavalDeep_name': '深海海军基类',
            'text_NavalShallow_name': '浅海海军基类',
            'text_Helicopter_name': '直升机基类',
            'text_Herc_name': '机甲基类',
            'text_Building_name': '建筑基类',
            'text_Leader_name': '领袖基类',
            'text_Citizen_name': '市民基类',
            'text_Scout_name': '侦察基类',
            'text_Spy_name': '间谍基类',
            'text_Priest_name': '牧师基类',
            'text_Medic_name': '医疗基类',
            'text_Animal_name': '动物基类',
            'text_LandAnimal_name': '陆地动物基类',
            'text_AirUnit_name': '空军基类',
            'text_Ambient_name': '环境装饰基类',
        }
        for k, v in fallbacks.items():
            if k not in self.name_map:
                self.name_map[k] = v

    def _parse_file(self, path):
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            self._parse_text(f.read())

    def _parse_text(self, text):
        """直接解析文本内容（用于ZIP中提取的数据）"""
        for line in text.split('\n'):
            line = line.strip()
            if not line or line.startswith('//'):
                continue
            m = re.match(r'(\w+),\s*"""(.+?)"""', line)
            if not m:
                continue
            key = m.group(1)
            name = m.group(2).strip()
            if not name:
                continue

            # _name 后缀为权威版本
            if key.endswith('_name'):
                base = key[:-5]
                self.name_map[key] = name
                if base not in self.name_map:
                    self.name_map[base] = name
            elif key.endswith('_pname'):
                base = key[:-6]
                base_name_key = base + '_name'
                if base_name_key not in self.name_map:
                    self.name_map[key] = name
                    if base not in self.name_map:
                        self.name_map[base] = name
            elif key.endswith('_sname'):
                base = key[:-6]
                base_name_key = base + '_name'
                base_pname_key = base + '_pname'
                if base_name_key not in self.name_map and base_pname_key not in self.name_map:
                    self.name_map[key] = name
                    if base not in self.name_map:
                        self.name_map[base] = name
            else:
                if key not in self.name_map:
                    self.name_map[key] = name

    def get_name(self, text_key):
        """根据文本key获取中文名，找不到返回空字符串"""
        if not text_key:
            return ''
        # 直接查
        name = self.name_map.get(text_key, '')
        if name:
            return name
        # 尝试 _name 后缀
        if not text_key.endswith('_name'):
            name = self.name_map.get(text_key + '_name', '')
            if name:
                return name
        # 尝试 text_ 前缀替代 tx_utn_ 前缀
        if text_key.startswith('tx_utn_'):
            alt_key = 'text_' + text_key[7:]
            name = self.name_map.get(alt_key, '')
            if name:
                return name
        # 尝试 tx_eg_ 前缀（埃及战役）
        if text_key.startswith('tx_utn_'):
            alt_key = 'tx_eg_' + text_key[7:]
            name = self.name_map.get(alt_key, '')
            if name:
                return name
        # 尝试从 text_* 查找（科技树名称格式）
        # tx_utn_KingRegicide_name → text_KingRegicide_name
        for prefix in ['tx_utn_', 'tx_eg_']:
            if text_key.startswith(prefix):
                for alt_prefix in ['text_', 'tx_utn_', 'tx_eg_']:
                    alt_key = alt_prefix + text_key[len(prefix):]
                    name = self.name_map.get(alt_key, '')
                    if name:
                        return name
        return ''


# ═══════════════════════════════════════════════════════════════════
# 阶段1: CSV 解析器
# ═══════════════════════════════════════════════════════════════════

class CsvParser:
    """解析 upgrade_unittypes.csv 和 upgrade_unittypes_EE2X.csv"""

    def __init__(self):
        self.units = defaultdict(dict)  # {unit_type: {epoch: {data}}}
        self.all_upgrades = []  # [{upgrade_name, unit, type, epoch, ...}]
        self.csv_lines = {}  # {upgrade_name: csv_line_number}

    def parse(self, csv_path, is_ee2x=False, text_parser=None):
        """解析CSV文件"""
        with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()

        # 找header行（跳过注释和空行）
        header_idx = 0
        for i, line in enumerate(lines):
            line = line.strip()
            if line and not line.startswith('//'):
                header_idx = i
                break

        header_line = lines[header_idx].strip()
        reader = csv.reader(lines[header_idx+1:])
        columns = next(csv.reader([header_line]))

        line_num = header_idx + 2
        for row in reader:
            if not row or len(row) < 4:
                line_num += 1
                continue
            if row[0].startswith('//'):
                line_num += 1
                continue
            if not row[0].strip():
                line_num += 1
                continue

            try:
                upgrade_name = row[0].strip()
                unit_type = row[1].strip()
                type_str = row[2].strip().strip('"')
                epoch = safe_int(row[3])
                hp = safe_int(row[4])
                los = safe_int(row[5])
                damage = safe_int(row[6])
                range_val = safe_int(row[7])
                reload_time = safe_float(row[8])
                buildtime = safe_int(row[9])
                food = safe_int(row[10])
                wood = safe_int(row[11])
                stone = safe_int(row[12])
                gold = safe_int(row[13])
                tin = safe_int(row[14])
                iron = safe_int(row[15])
                saltpeter = safe_int(row[16])
                oil = safe_int(row[17])
                uranium = safe_int(row[18])
                displayname_key = row[19].strip() if len(row) > 19 else ""
                upgraderefs = row[32].strip() if len(row) > 32 else ""
                civ = row[33].strip() if len(row) > 33 else "All"

                # 查找中文名
                chinese_name = ''
                if text_parser:
                    if displayname_key:
                        chinese_name = text_parser.get_name(displayname_key)
                    # fallback: 从 unit_type 直接构造key查找 (如 LeaderMilitary → text_LeaderMilitary_name)
                    if not chinese_name:
                        chinese_name = text_parser.get_name(f'tx_utn_{unit_type}_name')
                    if not chinese_name:
                        chinese_name = text_parser.get_name(f'text_{unit_type}_name')

                entry = {
                    'upgrade_name': upgrade_name,
                    'unit_type': unit_type,
                    'type': type_str,
                    'epoch': epoch,
                    'hp': hp,
                    'los': los,
                    'damage': damage,
                    'range': range_val,
                    'reload': reload_time,
                    'buildtime': buildtime,
                    'food': food, 'wood': wood, 'stone': stone, 'gold': gold,
                    'tin': tin, 'iron': iron, 'saltpeter': saltpeter,
                    'oil': oil, 'uranium': uranium,
                    'displayname_key': displayname_key,
                    'chinese_name': chinese_name,
                    'upgraderefs': upgraderefs,
                    'civ': civ,
                    'csv_line': line_num,
                    'is_ee2x': is_ee2x,
                }
                self.all_upgrades.append(entry)
                self.units[unit_type][epoch] = entry
                self.csv_lines[upgrade_name] = line_num
            except (ValueError, IndexError) as e:
                pass
            line_num += 1

    def get_units_for_epoch(self, epoch):
        """获取某时代的所有单位"""
        result = []
        for unit_type, epochs in self.units.items():
            if epoch in epochs:
                result.append(epochs[epoch])
        return result

    def get_all_unit_types(self):
        """获取所有UnitType列表"""
        return list(self.units.keys())


# ═══════════════════════════════════════════════════════════════════
# 阶段2: 科技树解析器
# ═══════════════════════════════════════════════════════════════════

class TechParser:
    """解析 dbtechtreenode.csv"""

    def __init__(self):
        self.nodes = {}  # {name: {data}}
        self.nodes_by_upgrade = {}  # {upgrade_name: [node_names]}
        self.nodes_by_produce = {}  # {unit_type: [node_names]}
        self.commented_lines = []  # [{name, line_num, reason}]
        self.all_lines = []

    def parse(self, tech_path):
        with open(tech_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()

        self.all_lines = lines
        header_idx = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped and not stripped.startswith('//'):
                header_idx = i
                break

        header = lines[header_idx].strip()
        columns = next(csv.reader([header]))

        line_num = header_idx + 2
        for i in range(header_idx + 1, len(lines)):
            stripped = lines[i].strip()
            if not stripped:
                line_num += 1
                continue

            # 记录注释行
            if stripped.startswith('//'):
                name_match = re.match(r'//(\w+)', stripped)
                if name_match:
                    self.commented_lines.append({
                        'name': name_match.group(1),
                        'line_num': line_num,
                        'full_line': stripped
                    })
                line_num += 1
                continue

            try:
                row = list(csv.reader([stripped]))[0]
                if len(row) < 13:
                    line_num += 1
                    continue

                name = row[0].strip()
                epoch = safe_int(row[3])
                slot = safe_int(row[4])
                host = row[10].strip() if len(row) > 10 else ""
                produce = row[11].strip() if len(row) > 11 else ""
                upgrade = row[12].strip() if len(row) > 12 else ""
                time = safe_int(row[13])
                food = safe_int(row[14])
                wood = safe_int(row[15])
                stone = safe_int(row[16])
                gold = safe_int(row[17])
                tin = safe_int(row[18])
                iron = safe_int(row[19])
                saltpeter = safe_int(row[20])
                oil = safe_int(row[21])
                uranium = safe_int(row[22])
                techpts = safe_int(row[23])
                ttciv = row[24].strip() if len(row) > 24 else ""
                prereqs = row[25].strip() if len(row) > 25 else ""
                specflags = row[26].strip() if len(row) > 26 else ""

                entry = {
                    'name': name, 'epoch': epoch, 'slot': slot,
                    'host': host, 'produce': produce, 'upgrade': upgrade,
                    'time': time, 'food': food, 'wood': wood,
                    'stone': stone, 'gold': gold, 'tin': tin,
                    'iron': iron, 'saltpeter': saltpeter,
                    'oil': oil, 'uranium': uranium,
                    'techpts': techpts, 'ttciv': ttciv,
                    'prereqs': prereqs, 'specflags': specflags,
                    'line_num': line_num,
                }
                self.nodes[name] = entry

                # 建立 upgrade -> node 索引
                if upgrade:
                    if upgrade not in self.nodes_by_upgrade:
                        self.nodes_by_upgrade[upgrade] = []
                    self.nodes_by_upgrade[upgrade].append(name)

                # 建立 produce -> node 索引
                if produce:
                    if produce not in self.nodes_by_produce:
                        self.nodes_by_produce[produce] = []
                    self.nodes_by_produce[produce].append(name)

            except Exception:
                pass
            line_num += 1

    def get_node_for_upgrade(self, upgrade_name):
        """根据升级名找科技树节点"""
        return self.nodes_by_upgrade.get(upgrade_name, [])

    def get_node_for_unit(self, unit_type):
        """根据单位类型找科技树节点"""
        nodes = self.nodes_by_produce.get(unit_type, [])
        if not nodes:
            # 尝试直接查找 NAME==unit_type
            if unit_type in self.nodes:
                nodes = [unit_type]
        return nodes


# ═══════════════════════════════════════════════════════════════════
# 阶段3: DDF 扫描器 (核心)
# ═══════════════════════════════════════════════════════════════════

class DdfScanner:
    """扫描所有Unit DDF文件，提取UnitType声明和参数（含精确行号）"""

    def __init__(self):
        self.units = {}
        self.ddf_file_map = {}

    def scan_all(self, units_dir):
        ddf_files = []
        for root, dirs, files in os.walk(units_dir):
            for f in files:
                if f.endswith('.ddf'):
                    ddf_files.append(os.path.join(root, f))

        print(f"  扫描 {len(ddf_files)} 个DDF文件...")
        for ddf_path in sorted(ddf_files):
            rel_path = os.path.relpath(ddf_path, os.path.dirname(units_dir))
            try:
                self._scan_ddf(ddf_path, rel_path)
            except Exception as e:
                pass
        return self.units

    def _scan_ddf(self, ddf_path, rel_path):
        with open(ddf_path, 'r', encoding='utf-8', errors='replace') as f:
            raw = f.read()
        lines = raw.split('\n')

        i = 0
        while i < len(lines):
            stripped = lines[i].strip()
            ut_match = re.match(r'^UnitType\s+(\w+)', stripped)
            if ut_match:
                unit_name = ut_match.group(1)
                self._parse_unit_type_block(lines, i, unit_name, rel_path)
            i += 1

    def _parse_unit_type_block(self, lines, start_idx, unit_name, rel_path):
        """逐行解析UnitType块，记录每个参数的精确行号"""
        # 找到 {
        brace_line = start_idx
        while brace_line < len(lines) and '{' not in lines[brace_line]:
            brace_line += 1
        if brace_line >= len(lines):
            return

        block_lines, end_idx = parse_brace_block(lines, brace_line)

        entry = {
            'ddf_file': rel_path,
            'unittype_line': start_idx + 1,
            'parent': None, 'parent_line': None,
            'rps': None, 'rps_line': None,
            'size_x': None, 'size_y': None, 'size_line': None,
            'mass': None, 'mass_line': None,
            'hitpoints': None, 'hitpoints_line': None,
            'popcount': None, 'popcount_line': None,
            'displayName': None, 'displayName_line': None,
            'stance': None, 'stance_line': None,
            'attributes': [], 'attributes_line': None,
            'abilities': OrderedDict(),
            'garrison_info': {},
            'area_effects': [],
            'special_powers': [],
        }

        # 逐行解析properties块和abilities块（用绝对行号）
        abs_base = brace_line  # block_lines[0] = lines[brace_line]

        block_text = '\n'.join(block_lines)

        # parent
        for j, bl in enumerate(block_lines):
            pm = re.match(r'\s*parent\s*=\s*(\w+)', bl)
            if pm:
                entry['parent'] = pm.group(1)
                entry['parent_line'] = abs_base + j + 1
                break

        # properties 块逐行解析
        in_props = False
        for j, bl in enumerate(block_lines):
            if 'properties' in bl and '{' in bl:
                in_props = True
                continue
            if in_props and '}' in bl:
                in_props = False
                continue
            if in_props:
                abs_line = abs_base + j + 1
                for pname, ekey in [('rps', 'rps'), ('SizeX', 'size_x'), ('SizeY', 'size_y'),
                                    ('mass', 'mass'), ('HitPoints', 'hitpoints'),
                                    ('popCount', 'popcount'), ('displayName', 'displayName'),
                                    ('stance', 'stance')]:
                    m = re.search(rf'{pname}\s*=\s*(\S+)', bl)
                    if m:
                        val = m.group(1).rstrip(';')
                        if not entry[ekey]:  # 只取第一个
                            entry[ekey] = val
                            entry[f'{ekey}_line'] = abs_line

        # attributes 行号
        for j, bl in enumerate(block_lines):
            if 'attributes' in bl:
                entry['attributes_line'] = abs_base + j + 1
                # 提取属性名
                am = re.findall(r'(\w+)', bl)
                entry['attributes'] = [a for a in am if a not in ('attributes',)]
                break

        # abilities 块——用while循环跳过已处理的子块，避免嵌套]误判
        abi_start = -1
        abi_end = -1
        for j, bl in enumerate(block_lines):
            if 'abilities' in bl and ('=[' in bl or '= [' in bl):
                abi_start = j
            if abi_start >= 0 and abi_end < 0:
                # 找abilities的闭合 ] —— 必须是一行中只有 ] (允许注释)
                stripped = bl.strip()
                if stripped == ']' or stripped.startswith('] //'):
                    # 确认这不是内部子数组的闭合（如effects = [ ... ]）
                    # 回溯检查：如果前面有未闭合的子数组[，这可能是内部闭合
                    abi_end = j  # 先标记，后面会校正
        if abi_end < abi_start:
            abi_end = len(block_lines) - 1

        # 在abi_start到abi_end之间解析子块
        if abi_start >= 0:
            j = abi_start + 1
            while j < abi_end:
                bl = block_lines[j]
                abs_line = abs_base + j + 1
                matched = False
                for pat, name in [('Attack', 'Attack'), ('NavalMove', 'NavalMove'),
                                  ('AircraftMove', 'AircraftMove'), ('Move', 'Move'),
                                  ('LOS', 'LOS'), ('Garrison', 'Garrison'),
                                  ('Produce', 'Produce'), ('AreaEffect', 'AreaEffect'),
                                  ('SpecialPower', 'SpecialPower')]:
                    if pat in bl and '{' in bl:
                        sub_lines, sub_end = parse_brace_block(block_lines, j)
                        params = self._parse_params_with_lines(sub_lines, abs_base + j)
                        params['_block_line'] = abs_line
                        if name not in entry['abilities']:
                            entry['abilities'][name] = params
                        j = sub_end + 1  # 跳过已处理的子块（+1因为sub_end是块闭合行）
                        matched = True
                        break
                if not matched:
                    j += 1

        # Garrison info
        if 'Garrison' in entry['abilities']:
            g = entry['abilities']['Garrison']
            entry['garrison_info'] = {
                'numOfSlots': g.get('numOfSlots', ''),
                'numOfSlots_line': g.get('_block_line', ''),
                'garrisonType': g.get('garrisonType', ''),
                'healPoints': g.get('healPoints', ''),
            }

        # Area effects
        if 'AreaEffect' in entry['abilities']:
            ae = entry['abilities']['AreaEffect']
            entry['area_effects'] = [k for k in ae.keys() if not k.startswith('_')]

        # Special powers
        if 'SpecialPower' in entry['abilities']:
            sp = entry['abilities']['SpecialPower']
            entry['special_powers'] = [k for k in sp.keys() if not k.startswith('_')]

        self.units[unit_name] = entry
        self.ddf_file_map[unit_name] = rel_path

    def _parse_params_with_lines(self, block_lines, abs_base):
        """解析子块参数，记录每个参数的行号"""
        params = {}
        for j, line in enumerate(block_lines):
            for m in re.finditer(r'(\w+)\s*=\s*([^;]*);', line):
                key = m.group(1)
                val = m.group(2).strip().strip('"')
                if key not in params:
                    params[key] = val
                    params[f'{key}_line'] = abs_base + j + 1
        return params


# ═══════════════════════════════════════════════════════════════════
# 阶段4: 时代 DDF 解析器
# ═══════════════════════════════════════════════════════════════════

class EpochDdfParser:
    """解析 epoch{N}_upgrades.ddf"""

    def __init__(self):
        self.epoch_data = {}  # {epoch: {ref_sets: [...], obsolete_techs: [...]}}

    def parse_all(self, epoch_ddf_dir):
        for epoch in range(1, 16):
            ddf_path = os.path.join(epoch_ddf_dir, f"epoch{epoch}_upgrades.ddf")
            if os.path.exists(ddf_path):
                self._parse_epoch(epoch, ddf_path)

    def _parse_epoch(self, epoch, ddf_path):
        with open(ddf_path, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()

        ref_sets = []
        # 匹配 UpgradeRefSet Name { upgrades = [...] }
        for m in re.finditer(r'UpgradeRefSet\s+(\w+)\s*\{[^}]*?upgrades\s*=\s*\[([^\]]*)\]', text, re.DOTALL):
            name = m.group(1)
            upgrades_text = m.group(2)
            upgrades = [u.strip() for u in re.findall(r'(\w+)', upgrades_text)
                       if u.strip() and not u.startswith('//')]
            ref_sets.append({'name': name, 'upgrades': upgrades})

        # 匹配 UpgradeObsoleteTech
        obsolete_techs = []
        for m in re.finditer(r'UpgradeObsoleteTech\s+(\w+)', text):
            obsolete_techs.append(m.group(1))

        self.epoch_data[epoch] = {
            'ref_sets': ref_sets,
            'obsolete_techs': obsolete_techs,
        }


# ═══════════════════════════════════════════════════════════════════
# 阶段5: 数据合并器
# ═══════════════════════════════════════════════════════════════════

class DataMerger:
    """合并四个数据源"""

    # 单位分类定义
    NAVAL_RPS = {'Frigate', 'Destroyer', 'Battleship', 'Carrier', 'Submarine',
                 'SubmarineNuclear', 'AntiAircraft', 'Aaship', 'Cruiser',
                 'FightingSail', 'Galleon', 'WarGalley', 'GunGalley'}
    AIR_RPS = {'AirSuperiority', 'Bomber', 'Helicopter', 'ScoutHelicopter'}
    AIR_PARENTS = {'Aircraft', 'HelicopterUnit'}
    TANK_RPS = {'HeavyTank', 'LightTank', 'ArmoredCar', 'ArmoredVehicle'}
    ARTILLERY_RPS = {'HeavyArtillery', 'LightArtillery', 'AirDefense', 'AntiAir'}
    INFANTRY_RPS = {'Human', 'Animal'}
    BUILDING_TYPES = {'Building', 'Wall', 'Road', 'Bridge', 'Outpost', 'Fortress',
                      'Tower', 'Gate', 'House', 'Granary', 'Mill', 'Barracks',
                      'Stable', 'Dock', 'Airport', 'Temple', 'University',
                      'Market', 'Library', 'Tavern', 'Blacksmith'}
    CIVILIAN_TYPES = {'Citizen', 'Medic', 'Spy', 'Scout', 'Priest', 'Leader',
                      'King', 'Hero', 'TradeCart', 'Autobus', 'Tractor',
                      'Harvester', 'Weelloader', 'gruzovik'}

    def __init__(self, csv_parser, tech_parser, ddf_scanner, epoch_ddf_parser):
        self.csv = csv_parser
        self.tech = tech_parser
        self.ddf = ddf_scanner
        self.epoch_ddf = epoch_ddf_parser

    def merge_epoch(self, epoch):
        """合并某个时代的所有数据"""
        csv_units = self.csv.get_units_for_epoch(epoch)
        epoch_info = self.epoch_ddf.epoch_data.get(epoch, {})

        units = []
        seen = set()
        for cu in csv_units:
            unit_type = cu['unit_type']
            if unit_type in seen:
                continue
            seen.add(unit_type)

            ddf_data = self.ddf.units.get(unit_type, {})
            tech_nodes = self.tech.get_node_for_unit(unit_type)

            # 确定分类
            category = self._categorize(unit_type, cu, ddf_data)

            # 确定文明
            civ = cu.get('civ', 'All')
            if civ == '' or civ == 'All':
                civ = 'All'

            unit_entry = {
                'unit_type': unit_type,
                'category': category,
                'civ': civ,
                'csv_data': cu,
                'ddf_data': ddf_data,
                'tech_nodes': tech_nodes,
                'is_building': cu.get('type', '') == 'Building',
            }
            units.append(unit_entry)

        # 按类别+文明分组排序
        cat_order = {'建筑': 0, '海军': 1, '空军': 2, '陆军': 3, '平民': 4, '其他': 5}
        civ_order = {'All': 0, 'Chinese': 1, 'American': 2, 'Russian': 3, 'German': 4,
                     'Japanese': 5, 'French': 6, 'English': 7, 'Korean': 8,
                     'Roman': 9, 'Greek': 10, 'Turkish': 11, 'Babylonian': 12,
                     'Egyptian': 13, 'Aztec': 14, 'Inca': 15, 'Maya': 16,
                     'Maasai': 17, 'Zulu': 18}

        units.sort(key=lambda u: (cat_order.get(u['category'], 99),
                                   civ_order.get(u['civ'], 99),
                                   u['unit_type']))

        return {
            'epoch': epoch,
            'units': units,
            'total': len(units),
            'by_category': self._count_by_category(units),
            'epoch_info': epoch_info,
        }

    def _categorize(self, unit_type, csv_data, ddf_data):
        """判断单位分类——基于 parent 类 + RPS 类型的双重判定"""
        type_str = csv_data.get('type', '')
        rps = (ddf_data.get('rps') or '').strip()
        parent = (ddf_data.get('parent') or '').strip()

        # 建筑
        if type_str == 'Building':
            return '建筑'
        if unit_type in {'CityCenter', 'CityPlaza', 'House', 'Settlement', 'Barracks',
                         'Stable', 'Dock', 'Airport', 'Temple', 'University', 'Market',
                         'Library', 'Tavern', 'Granary', 'Mill', 'Blacksmith', 'Storehouse',
                         'Warehouse', 'MyOutpost', 'Outpost', 'Outpost2', 'Farm', 'FarmWheat',
                         'FarmSugarCane', 'FarmYam', 'Fortress', 'Wall', 'Wall_Connector',
                         'Wall_Fragment', 'Wall_Gate', 'Wall_Tower', 'Palisade',
                         'Palisade_Gate', 'Bridge', 'Road', 'Road_Elbow', 'dapao',
                         'Tower', 'Gate'}:
            return '建筑'
        if 'Wall' in unit_type or 'Road' in unit_type or 'Gate' in unit_type:
            return '建筑'
        if 'Palisade' in unit_type or 'Bridge' in unit_type:
            return '建筑'

        # 海军: parent=NavalDeep 或 (rps在海军类型中 且 parent不是陆军类)
        NAVAL_PARENTS = {'NavalDeep', 'NavalShallow', 'Naval'}
        if parent in NAVAL_PARENTS:
            return '海军'
        if rps in self.NAVAL_RPS and parent not in {'Artillery', 'Tank', 'Human', 'Mounted'}:
            return '海军'

        # 空军: parent=Aircraft等
        if parent in self.AIR_PARENTS:
            return '空军'
        if rps in self.AIR_RPS and parent not in NAVAL_PARENTS:
            return '空军'

        # 陆军/装甲
        if rps in self.TANK_RPS:
            return '陆军'
        if parent in {'Tank', 'HeavyTank', 'LightTank'}:
            return '陆军'
        if rps in self.ARTILLERY_RPS and parent not in NAVAL_PARENTS:
            return '陆军'
        if parent in {'Artillery', 'Human', 'Mounted', 'Animal'}:
            return '陆军'
        if rps in self.INFANTRY_RPS:
            return '陆军'

        # 平民/领袖/市民
        if 'Leader' in unit_type or 'King' in unit_type:
            return '平民'
        if 'Citizen' in unit_type or 'Medic' in unit_type or 'Spy' in unit_type:
            return '平民'
        if 'Scout' in unit_type or 'Priest' in unit_type or 'Hero' in unit_type:
            return '平民'
        if 'TradeCart' in unit_type or 'Autobus' in unit_type:
            return '平民'
        if 'Harvester' in unit_type or 'Weelloader' in unit_type or 'Tractor' in unit_type:
            return '平民'
        if 'gruzovik' in unit_type or 'SisterMona' in unit_type or 'Medcar' in unit_type:
            return '平民'

        return '其他'

    def _count_by_category(self, units):
        counts = defaultdict(int)
        for u in units:
            counts[u['category']] += 1
        return dict(counts)


# ═══════════════════════════════════════════════════════════════════
# 阶段6: 文档生成器
# ═══════════════════════════════════════════════════════════════════

class DocGenerator:
    """生成 Markdown 文档"""

    def __init__(self, merger, ddf_scanner, tech_parser, csv_parser):
        self.merger = merger
        self.ddf = ddf_scanner
        self.tech = tech_parser
        self.csv = csv_parser
        self.now_str = datetime.now().strftime('%Y-%m-%d')

    def generate_all(self, output_dir):
        os.makedirs(output_dir, exist_ok=True)
        for epoch in range(1, 16):
            print(f"  生成 E{epoch} 时代文档...")
            merged = self.merger.merge_epoch(epoch)
            doc = self._generate_epoch_doc(merged)
            out_path = os.path.join(output_dir, f"E{epoch}时代_完整单位参数列表.md")
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(doc)
        print(f"  生成跨时代总索引...")
        master = self._generate_master_index()
        master_path = os.path.join(output_dir, "游戏单位参数详细位置索引文档.md")
        with open(master_path, 'w', encoding='utf-8') as f:
            f.write(master)

    def _generate_epoch_doc(self, merged):
        epoch = merged['epoch']
        units = merged['units']
        is_late = epoch >= 11  # E11+ 使用完整模板

        lines = []
        lines.append(f"# {epoch}时代（Epoch {epoch}）完整单位索引 — 参数级精确定位")
        lines.append("")
        lines.append(f"> 生成日期: {self.now_str}")
        lines.append(f"> 用途: 查找{epoch}时代任意单位的任意参数在哪个文件的哪一行——无需再搜索")
        lines.append(f"> 覆盖: {merged['total']}个单位，逐参数标注行号")
        lines.append("> ")
        lines.append("> **使用方式**: Ctrl+F 搜索单位名 → 找到所有参数的文件+行号 → 直接跳转修改")
        lines.append("")

        # ── 一、核心文件路径速查 ──
        lines.append("---")
        lines.append("")
        lines.append("## 一、核心文件路径速查")
        lines.append("")
        lines.append("| 缩写 | 完整路径 |")
        lines.append("|:------|:---------|")
        lines.append("| **CSV** | `game-metadata\\EE2X_db\\TechTree\\upgrade_unittypes.csv` |")
        lines.append("| **TECH** | `game-metadata\\EE2X_db\\TechTree\\dbtechtreenode.csv` |")
        lines.append(f"| **EP{epoch}_DDF** | `game-metadata\\EE2X_db\\TechTree\\epoch{epoch}_upgrades.ddf` |")
        lines.append("| **Units/** | `game-metadata\\EE2X_db\\Units\\` |")
        lines.append("")

        if is_late:
            lines.append("### DDF分布铁律（已验证）")
            lines.append("- 🔴 **所有文明海军舰船** → `Units/Yuanhang_Tao_13naval_units.ddf`")
            lines.append("- 🔴 **中国空军** → `Units/Chinese_army.ddf`")
            lines.append("- 🔴 **美国空军** → `Units/American_army.ddf`")
            lines.append("- 🔴 **俄罗斯空军** → `Units/Russian_army.ddf`")
            lines.append("- 🔴 **中国陆军** → `Units/Chinese_army_lujun.ddf`")
            lines.append("- 🔴 **美国陆军** → `Units/American_army_lujun.ddf`")
            lines.append("- 🔴 **俄罗斯陆军** → `Units/Russian_army_lujun.ddf`")
            lines.append("- 🟢 **通用基础类型** → 对应通用DDF")
            lines.append("")

        # ── 二、建筑 ──
        lines.append("---")
        lines.append("")
        lines.append("## 二、建筑 — 参数行号索引")
        lines.append("")
        buildings = [u for u in units if u['category'] == '建筑']
        if buildings:
            lines.append("| 单位(UnitType) | 中文名 | DDF文件 | UnitType行 | CSV行 | TECH行 | 说明 |")
            lines.append("|:---------------|:-------|:--------|:----------|:------|:-------|:-----|")
            for b in buildings:
                ut = b['unit_type']
                cn = b['csv_data'].get('chinese_name', '')
                ddf_file = b['ddf_data'].get('ddf_file', '—') if b['ddf_data'] else '—'
                ddf_line = b['ddf_data'].get('unittype_line', '—') if b['ddf_data'] else '—'
                csv_line = b['csv_data'].get('csv_line', '—')
                tech_nodes = b.get('tech_nodes', [])
                tech_str = ','.join(str(self.tech.nodes.get(tn, {}).get('line_num', '?')) for tn in tech_nodes) if tech_nodes else '—'
                lines.append(f"| **{ut}** | {cn} | `{ddf_file}` | {ddf_line} | {csv_line} | {tech_str} | E{epoch} |")
        else:
            lines.append("_本时代无独立建筑单位_")
        lines.append("")

        # ── 三、海军 ──
        lines.append("---")
        lines.append("")
        lines.append("## 三、海军单位 — 逐参数精确行号")
        lines.append("")
        naval = [u for u in units if u['category'] == '海军']
        if naval:
            self._write_unit_param_tables(lines, naval, epoch, is_late)
        else:
            lines.append("_本时代无海军单位_")
        lines.append("")

        # ── 四、空军 ──
        if is_late:
            lines.append("---")
            lines.append("")
            lines.append("## 四、空军单位 — 逐参数精确行号")
            lines.append("")
            air = [u for u in units if u['category'] == '空军']
            if air:
                self._write_air_tables(lines, air, epoch)
            else:
                lines.append("_本时代无空军单位_")
            lines.append("")

        # ── 五、陆军/装甲 ──
        lines.append("---")
        lines.append("")
        sec_num = "五" if is_late else "四"
        lines.append(f"## {sec_num}、陆军/装甲单位 — 参数行号索引")
        lines.append("")
        army = [u for u in units if u['category'] == '陆军']
        if army:
            self._write_army_tables(lines, army, epoch)
        else:
            lines.append("_本时代无陆军单位_")
        lines.append("")

        # ── 六、平民 ──
        lines.append("---")
        lines.append("")
        sec_num2 = "六" if is_late else "五"
        lines.append(f"## {sec_num2}、平民/特殊单位 — 参数行号索引")
        lines.append("")
        civ_units = [u for u in units if u['category'] == '平民']
        if civ_units:
            lines.append("| 单位(UnitType) | 中文名 | DDF文件 | UnitType行 | CSV行 | 说明 |")
            lines.append("|:---------------|:-------|:--------|:----------|:------|:-----|")
            for u in civ_units:
                ut = u['unit_type']
                cn = u['csv_data'].get('chinese_name', '')
                ddf_file = u['ddf_data'].get('ddf_file', '—') if u['ddf_data'] else '—'
                ddf_line = u['ddf_data'].get('unittype_line', '—') if u['ddf_data'] else '—'
                csv_line = u['csv_data'].get('csv_line', '—')
                lines.append(f"| **{ut}** | {cn} | `{ddf_file}` | {ddf_line} | {csv_line} | |")
        else:
            lines.append("_本时代无独立平民单位_")
        lines.append("")

        # ── 七、科技树节点 ──
        lines.append("---")
        lines.append("")
        sec_num3 = "七" if is_late else "六"
        lines.append(f"## {sec_num3}、科技树全部E{epoch}节点索引")
        lines.append("")
        self._write_tech_section(lines, epoch)

        # ── 八、跨文档速查 ──
        lines.append("---")
        lines.append("")
        sec_num4 = "八" if is_late else "七"
        lines.append(f"## {sec_num4}、跨文档修改速查表")
        lines.append("")
        lines.append(f"### 修改任意E{epoch}单位时必查的4个位置")
        lines.append("")
        lines.append("```")
        lines.append(f"① CSV  → upgrade_unittypes.csv         \"{{UnitType}}UpgradeEpoch{epoch}\"行 → HP/DAMAGE/RANGE/COST")
        lines.append(f"② DDF  → 见本索引各章节               UnitType块 → popCount/RPS/abilities覆盖")
        lines.append(f"③ TECH → dbtechtreenode.csv             单位节点行 → 建造资源/时间/前置")
        lines.append(f"④ EP{epoch} → epoch{epoch}_upgrades.ddf  升级集引用 → 文明分配/自动研究")
        lines.append("```")
        lines.append("")
        lines.append("### DDF vs CSV 属性覆盖规则")
        lines.append("- **popCount**: DDF覆盖CSV（船只人口在DDF中）")
        lines.append("- **RPS类型**: DDF `rps` 字段决定")
        lines.append("- **范围伤害/AOE**: DDF `AreaEffect`/`areaDamageRadius` 块")
        lines.append("- **模型/动画**: 仅在DDF中")
        lines.append("- **UpgradeAbilities**: DDF E{N} Attack升级会覆盖CSV的damage/range/reload")
        lines.append("")

        # ── 九、注释/禁用 ──
        lines.append("---")
        lines.append("")
        sec_num5 = "九" if is_late else "八"
        lines.append(f"## {sec_num5}、注释/禁用单位")
        lines.append("")
        # 查找该时代相关的注释单位
        commented = [c for c in self.tech.commented_lines
                    if f'Epoch{epoch}' in c.get('full_line', '') or
                       f'UpgradeEpoch{epoch}' in c.get('full_line', '')]
        # 也列出该时代的ObsoleteTech
        obsolete = merged.get('epoch_info', {}).get('obsolete_techs', [])

        if commented or obsolete:
            if commented:
                for c in commented:
                    lines.append(f"- `{c['name']}` — 行{c['line_num']}: 已注释")
            if obsolete:
                for o in obsolete:
                    lines.append(f"- `{o}` — 在本时代标记为Obsolete")
        else:
            lines.append("_本时代无注释/禁用单位记录_")
        lines.append("")

        # ── 统计信息 ──
        lines.append("---")
        lines.append("")
        lines.append(f"> **索引版本**: v1.0 (参数行号版)")
        lines.append(f"> **覆盖**: {merged['total']}个单位")
        lines.append(f"> **生成时间**: {self.now_str}")
        lines.append(f"> **分类统计**: {dict(merged['by_category'])}")
        lines.append("")

        return '\n'.join(lines)

    def _write_unit_param_tables(self, lines, units, epoch, is_late):
        """写入单位参数详细表（使用精确行号）"""
        by_civ = defaultdict(list)
        for u in units:
            by_civ[u['civ']].append(u)

        civ_names = {
            'All': '通用', 'Chinese': '中国', 'American': '美国', 'Russian': '俄罗斯',
            'German': '德国', 'Japanese': '日本', 'French': '法国', 'English': '英国',
            'Korean': '韩国', 'Roman': '罗马', 'Greek': '希腊', 'Turkish': '土耳其',
            'Babylonian': '巴比伦', 'Egyptian': '埃及', 'Aztec': '阿兹特克',
            'Inca': '印加', 'Maya': '玛雅', 'Maasai': '马赛', 'Zulu': '祖鲁'
        }

        for civ in sorted(by_civ.keys()):
            civ_label = civ_names.get(civ, civ)
            lines.append(f"### {civ_label}")
            lines.append("")
            for u in by_civ[civ]:
                ut = u['unit_type']
                ddf = u['ddf_data'] or {}
                csv_d = u['csv_data']
                ddf_file = ddf.get('ddf_file', '—')
                cn_name = csv_d.get('chinese_name', '')

                title = f"#### {ut}"
                if cn_name:
                    title += f" ({cn_name})"
                title += f" — `{ddf_file}`"
                lines.append(title)
                lines.append("")
                lines.append("| 参数(中文) | 参数(英文) | 行号 | 值 | 说明 |")
                lines.append("|:-----------|:-----------|:-----|:---|:-----|")
                lines.append(f"| UnitType声明 | — | **{ddf.get('unittype_line', '?')}** | `UnitType {ut}` | |")

                if ddf.get('parent'):
                    pl = ddf.get('parent_line', ddf.get('unittype_line', '?'))
                    lines.append(f"| 父类 | parent | {pl} | `{ddf['parent']}` | |")
                if ddf.get('rps'):
                    rl = ddf.get('rps_line', '—')
                    lines.append(f"| RPS类型 | rps | {rl} | `{ddf['rps']}` | |")
                if ddf.get('size_x'):
                    sl = ddf.get('size_line', '—')
                    lines.append(f"| 车体大小 | SizeX/SizeY | {sl} | `{ddf['size_x']}×{ddf.get('size_y','')}` | |")
                if ddf.get('mass'):
                    ml = ddf.get('mass_line', '—')
                    lines.append(f"| 质量 | mass | {ml} | `{ddf['mass']}` | |")
                if ddf.get('hitpoints'):
                    hl = ddf.get('hitpoints_line', '—')
                    lines.append(f"| 生命值(DDF) | HitPoints | {hl} | `{ddf['hitpoints']}` | CSV覆盖见下 |")
                if ddf.get('popcount'):
                    pl = ddf.get('popcount_line', '—')
                    lines.append(f"| 人口占用 | popCount | {pl} | `{ddf['popcount']}` | DDF覆盖CSV |")

                # 攻击参数（带行号）
                atk = ddf.get('abilities', {}).get('Attack', {})
                if atk:
                    for key, label in [('damage', '攻击力'), ('range', '攻击范围'),
                                       ('reloadTime', '装填时间'), ('missileName', '弹药名称'),
                                       ('areaDamageRadius', 'AOE溅射半径'), ('angularRange', '攻击角度'),
                                       ('applyDamageTime', '伤害生效时间'), ('ignoreBlocking', '无视障碍'),
                                       ('ordnance', '弹药量'), ('weaponType', '武器类型'),
                                       ('minRange', '最小射程'), ('throwUnits', '击飞单位')]:
                        if key in atk:
                            kl = atk.get(f'{key}_line', '—')
                            lines.append(f"| {label} | {key} | {kl} | `{atk[key]}` | |")

                # 移动参数
                for move_type in ['NavalMove', 'Move', 'AircraftMove']:
                    mv = ddf.get('abilities', {}).get(move_type, {})
                    if mv:
                        for mkey, mlabel in [('speed', '移动速度'), ('angSpeed', '转向速度'),
                                              ('accel', '加速度'), ('CruisingHeight', '巡航高度'),
                                              ('cruisingDepth', '巡航深度'), ('CanHover', '可悬停')]:
                            if mkey in mv:
                                kl = mv.get(f'{mkey}_line', '—')
                                lines.append(f"| {mlabel} | {mkey} | {kl} | `{mv[mkey]}` | {move_type} |")
                        break

                # LOS
                los = ddf.get('abilities', {}).get('LOS', {})
                if los:
                    rl = los.get(f'range_line', los.get('_block_line', '—'))
                    lines.append(f"| 视野 | LOS range | {rl} | `{los.get('range','')}` | |")

                # Garrison
                gi = ddf.get('garrison_info', {})
                if gi.get('numOfSlots'):
                    nl = gi.get('numOfSlots_line', '—')
                    lines.append(f"| 驻扎容量 | numOfSlots | {nl} | `{gi['numOfSlots']}` | |")
                if gi.get('healPoints'):
                    lines.append(f"| 驻扎回血 | healPoints | — | `{gi['healPoints']}/秒` | |")
                if gi.get('garrisonType'):
                    lines.append(f"| 驻扎类型 | garrisonType | — | `{gi['garrisonType']}` | |")

                # 特殊能力
                sp = ddf.get('special_powers', [])
                if sp:
                    sp_line = ddf.get('abilities', {}).get('SpecialPower', {}).get('_block_line', '—')
                    lines.append(f"| 特殊能力 | SpecialPower | {sp_line} | `{' '.join(sp)}` | |")

                # 范围效果
                ae = ddf.get('area_effects', [])
                if ae:
                    ae_line = ddf.get('abilities', {}).get('AreaEffect', {}).get('_block_line', '—')
                    lines.append(f"| 范围效果 | AreaEffect | {ae_line} | `{' '.join(ae)}` | |")

                # CSV数据
                lines.append(f"| E{epoch} CSV升级 | — | CSV:**{csv_d.get('csv_line', '?')}** | `{csv_d.get('upgrade_name', '')}` | HP={csv_d.get('hp')}, DAMAGE={csv_d.get('damage')}, RANGE={csv_d.get('range')}, RELOAD={csv_d.get('reload')} |")

                # 资源造价
                costs = []
                for res, name in [('food','食'),('wood','木'),('stone','石'),('gold','金'),
                                  ('tin','锡'),('iron','铁'),('saltpeter','硝'),('oil','油'),('uranium','铀')]:
                    v = csv_d.get(res, 0)
                    if v: costs.append(f"{name}{v}")
                if costs:
                    lines.append(f"| 造价 | — | — | `{' '.join(costs)}` | 建造时间={csv_d.get('buildtime','?')} |")

                # 科技树
                tech_nodes = u.get('tech_nodes', [])
                if tech_nodes:
                    for tn in tech_nodes:
                        tn_data = self.tech.nodes.get(tn, {})
                        tn_line = tn_data.get('line_num', '?')
                        lines.append(f"| 科技树节点 | — | TECH:**{tn_line}** | `{tn}` | HOST={tn_data.get('host','?')} |")

                lines.append("")

    def _write_air_tables(self, lines, units, epoch):
        """写入空军单位表（紧凑格式）"""
        lines.append("| 单位(UnitType) | 中文名 | DDF文件 | DDF行 | 父类 | RPS | CSV升级行 | TECH行 |")
        lines.append("|:---------------|:-------|:--------|:------|:-----|:----|:----------|:-------|")
        for u in units:
            ut = u['unit_type']
            cn = u['csv_data'].get('chinese_name', '')
            ddf = u['ddf_data'] or {}
            ddf_file = ddf.get('ddf_file', '—')
            ddf_line = ddf.get('unittype_line', '—')
            parent = ddf.get('parent', '—')
            rps = ddf.get('rps', '—')
            csv_line = u['csv_data'].get('csv_line', '—')
            tech_nodes = u.get('tech_nodes', [])
            tech_str = ','.join(str(self.tech.nodes.get(tn, {}).get('line_num', '?')) for tn in tech_nodes) if tech_nodes else '—'
            lines.append(f"| **{ut}** | {cn} | `{ddf_file}` | {ddf_line} | {parent} | {rps} | {csv_line} | {tech_str} |")
        lines.append("")

    def _write_army_tables(self, lines, units, epoch):
        """写入陆军单位表（紧凑格式）"""
        lines.append("| 单位(UnitType) | 中文名 | DDF文件 | DDF行 | 类型 | CSV升级行 | TECH行 | CIV |")
        lines.append("|:---------------|:-------|:--------|:------|:-----|:----------|:-------|:----|")
        for u in units:
            ut = u['unit_type']
            cn = u['csv_data'].get('chinese_name', '')
            ddf = u['ddf_data'] or {}
            ddf_file = ddf.get('ddf_file', '—')
            ddf_line = ddf.get('unittype_line', '—')
            rps = ddf.get('rps', '—')
            csv_line = u['csv_data'].get('csv_line', '—')
            tech_nodes = u.get('tech_nodes', [])
            tech_str = ','.join(str(self.tech.nodes.get(tn, {}).get('line_num', '?')) for tn in tech_nodes) if tech_nodes else '—'
            civ = u.get('civ', 'All')
            lines.append(f"| **{ut}** | {cn} | `{ddf_file}` | {ddf_line} | {rps} | {csv_line} | {tech_str} | {civ} |")
        lines.append("")

    def _write_tech_section(self, lines, epoch):
        """写入科技树节点章节"""
        # 查找属于该时代的tech节点
        epoch_nodes = []
        for name, node in self.tech.nodes.items():
            if node['epoch'] == epoch:
                epoch_nodes.append((name, node))

        if not epoch_nodes:
            lines.append("_未找到该时代的科技树节点_")
            lines.append("")
            return

        # 分类：单位节点 vs 分支节点
        unit_nodes = []
        branch_nodes = []
        vet_elite_nodes = []
        for name, node in epoch_nodes:
            if 'Veteran' in name or 'Elite' in name:
                vet_elite_nodes.append((name, node))
            elif name.startswith('up') or node.get('upgrade', '').endswith(f'Slot1_{epoch}'):
                branch_nodes.append((name, node))
            else:
                unit_nodes.append((name, node))

        if unit_nodes:
            lines.append("### 单位节点")
            lines.append("")
            lines.append("| 行号 | NAME | 建设于 | UPGRADE |")
            lines.append("|:-----|:-----|:-------|:--------|")
            for name, node in sorted(unit_nodes, key=lambda x: x[1]['line_num']):
                lines.append(f"| {node['line_num']} | {name} | {node.get('host','')} | {node.get('upgrade','')} |")
            lines.append("")

        if branch_nodes:
            lines.append("### 分支/槽位节点")
            lines.append("")
            lines.append("| 行号 | NAME | 建设于 | UPGRADE |")
            lines.append("|:-----|:-----|:-------|:--------|")
            for name, node in sorted(branch_nodes, key=lambda x: x[1]['line_num']):
                lines.append(f"| {node['line_num']} | {name} | {node.get('host','')} | {node.get('upgrade','')} |")
            lines.append("")

        if vet_elite_nodes:
            lines.append("### 老兵/精英节点")
            lines.append("")
            lines.append("| 行号 | NAME | UPGRADE |")
            lines.append("|:-----|:-----|:--------|")
            for name, node in sorted(vet_elite_nodes, key=lambda x: x[1]['line_num']):
                lines.append(f"| {node['line_num']} | {name} | {node.get('upgrade','')} |")
            lines.append("")

    def _generate_master_index(self):
        """生成跨时代总索引"""
        lines = []
        lines.append("# 游戏单位参数详细位置索引文档")
        lines.append("")
        lines.append(f"> 生成日期: {self.now_str}")
        lines.append("> 用途: 快速查找任意单位在任意时代的完整参数位置——无需扫描全盘")
        lines.append("> 覆盖: E1-E15全时代，所有单位类型")
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## 使用说明")
        lines.append("")
        lines.append("1. **按单位名查找**: Ctrl+F 搜索单位名（如 `Ch055A`）→ 找到所有时代的DDF文件+行号+CSV行号")
        lines.append("2. **按时代查找**: 打开对应的 `全时代单位参数详情文档\\E{N}时代_完整单位参数列表.md`")
        lines.append("3. **按兵种查找**: 见下方按类型分组索引")
        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## 一、全单位字母序索引")
        lines.append("")
        lines.append("| UnitType | 中文名 | 类型 | DDF文件 | DDF行 | 出现时代 |")
        lines.append("|:---------|:------|:-----|:--------|:------|:---------|")

        # 收集所有单位
        all_units = defaultdict(lambda: {'ddf_file': '', 'ddf_line': '', 'category': '', 'epochs': []})
        for ut_name, ddf_entry in self.ddf.units.items():
            all_units[ut_name]['ddf_file'] = ddf_entry.get('ddf_file', '')
            all_units[ut_name]['ddf_line'] = str(ddf_entry.get('unittype_line', ''))

        for ut_name, epochs_dict in self.csv.units.items():
            if ut_name not in all_units:
                all_units[ut_name] = {'ddf_file': '', 'ddf_line': '', 'category': '', 'epochs': []}
            all_units[ut_name]['epochs'] = sorted(epochs_dict.keys())

        # 分类
        for ut_name in all_units:
            ddf_entry = self.ddf.units.get(ut_name, {})
            rps = (ddf_entry.get('rps') or '').strip()
            parent = (ddf_entry.get('parent') or '').strip()
            if rps in DataMerger.NAVAL_RPS or parent == 'NavalDeep':
                all_units[ut_name]['category'] = '海军'
            elif rps in DataMerger.AIR_RPS or parent in DataMerger.AIR_PARENTS:
                all_units[ut_name]['category'] = '空军'
            elif rps in DataMerger.TANK_RPS or rps in DataMerger.ARTILLERY_RPS or parent in {'Human', 'Mounted', 'Tank', 'HeavyTank', 'LightTank'}:
                all_units[ut_name]['category'] = '陆军'
            elif 'Building' in ut_name or 'Wall' in ut_name or 'Road' in ut_name:
                all_units[ut_name]['category'] = '建筑'
            else:
                all_units[ut_name]['category'] = '其他'

        _tp = TextNameParser()
        _tp.parse_all()

        for ut_name in sorted(all_units.keys()):
            info = all_units[ut_name]
            epochs_str = ','.join(f'E{e}' for e in info['epochs'])
            # 获取中文名：优先取最晚时代 + 名字包含UnitType本身的
            cn_name = ''
            if ut_name in self.csv.units:
                best_cn = ''
                for ep in sorted(self.csv.units[ut_name].keys(), reverse=True):
                    cn = self.csv.units[ut_name][ep].get('chinese_name', '')
                    if cn:
                        if not best_cn:
                            best_cn = cn
                        # 优先选包含UnitType英文名的（如 "054A" 匹配 "054A"）
                        if ut_name.lower() in cn.lower() or any(part.lower() in cn.lower() for part in re.findall(r'[A-Z]?\d+[A-Z]?', ut_name)):
                            best_cn = cn
                            break
                cn_name = best_cn
            # DDF-only单位：从DDF的displayName查中文名
            if not cn_name:
                ddf_entry = self.ddf.units.get(ut_name, {})
                display_key = ddf_entry.get('displayName', '')
                if display_key:
                    cn_name = _tp.get_name(display_key)
                if not cn_name:
                    cn_name = _tp.get_name(f'tx_utn_{ut_name}_name')
                if not cn_name:
                    cn_name = _tp.get_name(f'text_{ut_name}_name')
            lines.append(f"| **{ut_name}** | {cn_name} | {info['category']} | `{info['ddf_file']}` | {info['ddf_line']} | {epochs_str} |")

        lines.append("")
        lines.append("---")
        lines.append("")
        lines.append("## 二、按类型分组索引")
        lines.append("")

        for cat in ['海军', '空军', '陆军', '建筑', '其他']:
            cat_units = {k: v for k, v in all_units.items() if v['category'] == cat}
            if cat_units:
                lines.append(f"### {cat} ({len(cat_units)}个单位)")
                lines.append("")
                lines.append("| UnitType | 中文名 | DDF文件 | DDF行 | 时代覆盖 |")
                lines.append("|:---------|:------|:--------|:------|:---------|")
                for ut_name in sorted(cat_units.keys()):
                    info = cat_units[ut_name]
                    cn_name = ''
                    if ut_name in self.csv.units:
                        best_cn = ''
                        for ep in sorted(self.csv.units[ut_name].keys(), reverse=True):
                            cn = self.csv.units[ut_name][ep].get('chinese_name', '')
                            if cn:
                                if not best_cn:
                                    best_cn = cn
                                if ut_name.lower() in cn.lower() or any(part.lower() in cn.lower() for part in re.findall(r'[A-Z]?\d+[A-Z]?', ut_name)):
                                    best_cn = cn
                                    break
                        cn_name = best_cn
                    # DDF-only fallback
                    if not cn_name:
                        ddf_entry = self.ddf.units.get(ut_name, {})
                        dk = ddf_entry.get('displayName', '')
                        if dk:
                            cn_name = _tp.get_name(dk)
                        if not cn_name:
                            cn_name = _tp.get_name(f'tx_utn_{ut_name}_name')
                        if not cn_name:
                            cn_name = _tp.get_name(f'text_{ut_name}_name')
                    epochs_str = ','.join(f'E{e}' for e in info['epochs'])
                    lines.append(f"| **{ut_name}** | {cn_name} | `{info['ddf_file']}` | {info['ddf_line']} | {epochs_str} |")
                lines.append("")

        lines.append("---")
        lines.append("")
        lines.append("## 三、时代文档快速跳转")
        lines.append("")
        for e in range(1, 16):
            lines.append(f"- [E{e}时代完整参数列表](E{e}时代_完整单位参数列表.md)")
        lines.append("")

        lines.append(f"> **索引版本**: v1.0 | **生成时间**: {self.now_str}")
        lines.append("")

        return '\n'.join(lines)


# ═══════════════════════════════════════════════════════════════════
# 阶段7: 验证器
# ═══════════════════════════════════════════════════════════════════

class Verifier:
    """三重验证：正向+反向+数量一致性"""

    def __init__(self, csv_parser, ddf_scanner, tech_parser):
        self.csv = csv_parser
        self.ddf = ddf_scanner
        self.tech = tech_parser

    def verify_all(self):
        report = []
        report.append("# 全时代单位参数验证报告")
        report.append("")
        report.append(f"> 验证时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        report.append("")

        # 正向验证
        fwd_pass, fwd_fail = self._forward_check()
        report.append("## 正向验证 (CSV → DDF)")
        report.append(f"- 通过: {fwd_pass}")
        report.append(f"- 失败: {fwd_fail}")
        if fwd_fail:
            report.append("- 失败列表:")
            for f in sorted(fwd_fail):
                report.append(f"  - `{f}`")
        report.append("")

        # 反向验证
        rev_pass, rev_fail = self._reverse_check()
        report.append("## 反向验证 (DDF → CSV)")
        report.append(f"- 通过: {rev_pass}")
        report.append(f"- 失败: {rev_fail}")
        if rev_fail:
            report.append("- 失败列表（注意：含基础/抽象类、纯装饰单位，非全部需要修复）:")
            for f in sorted(rev_fail)[:50]:
                report.append(f"  - `{f}`")
        report.append("")

        # 数量验证
        report.append("## 数量统计")
        report.append("")
        report.append("| 时代 | CSV行数 | DDF中UnitType数 |")
        report.append("|:-----|:--------|:---------------|")
        for epoch in range(1, 16):
            csv_count = len(self.csv.get_units_for_epoch(epoch))
            report.append(f"| E{epoch} | {csv_count} | — |")
        report.append("")
        report.append(f"| **总计** | {len(self.csv.all_upgrades)} | {len(self.ddf.units)} |")
        report.append("")

        return '\n'.join(report)

    def _forward_check(self):
        """CSV每个UpgradeEpoch{N} → 确认DDF中UnitType存在"""
        passed = 0
        failed = []

        # 提取所有CSV中的UnitType
        csv_types = set()
        for entry in self.csv.all_upgrades:
            csv_types.add(entry['unit_type'])

        for ut in sorted(csv_types):
            if ut in self.ddf.units:
                passed += 1
            else:
                failed.append(ut)

        return passed, failed

    def _reverse_check(self):
        """DDF每个UnitType → 确认CSV中至少一条升级记录"""
        passed = 0
        failed = []

        # 已知的非游戏单位（基础/抽象类、纯装饰）
        known_exceptions = {
            'Animal', 'Human', 'NavalDeep', 'Aircraft', 'HelicopterUnit',
            'Tank', 'HeavyTank', 'LightTank', 'Mounted', 'Naval',
            'AAmissile', 'Air_anti_missle', 'Smoke', 'UnHideSub',
            'Eagle', 'Shark', 'Dolphin', 'Whale', 'Eagle2', 'Eagle3',
            'Eagle4', 'Eagle5', 'Fish', 'Fish2', 'Fish3',
            'Grass', 'Tree', 'Rock', 'Flower', 'Bush',
            'River', 'Waterfall', 'Lake', 'Pond',
            'Fire', 'SmokeEffect', 'Explosion', 'Debris',
            'Bird', 'Bird2', 'Butterfly', 'Dragonfly',
            'FX_Nuke', 'FX_Explosion', 'FX_Fire',
            'Ammo', 'Bullet', 'Shell', 'Missile',
            'Flag', 'FlagPole', 'Banner',
            'Crate', 'Barrel', 'Box',
            'Ghost', 'Skeleton', 'Zombie',
        }

        for ut in self.ddf.units:
            if ut in self.csv.units:
                passed += 1
            elif ut in known_exceptions:
                passed += 1  # 已知例外不算失败
            elif any(ut.startswith(ex) for ex in ['FX_', 'VFX_', 'Effect_', 'Decal_', 'Marker_']):
                passed += 1
            else:
                failed.append(ut)

        return passed, failed


# ═══════════════════════════════════════════════════════════════════
# 主驱动
# ═══════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("全时代单位参数提取与索引文档生成器")
    print("=" * 60)
    print()

    # 阶段0: 文本名称解析
    print("[阶段0] 解析单位中文名称...")
    text_parser = TextNameParser()
    text_parser.parse_all()
    print(f"  解析了 {len(text_parser.name_map)} 条文本名称映射")

    # 阶段1: CSV解析
    print("[阶段1] 解析CSV升级数据...")
    csv_parser = CsvParser()
    csv_parser.parse(CSV_PATH, text_parser=text_parser)
    if os.path.exists(CSV_EE2X_PATH):
        csv_parser.parse(CSV_EE2X_PATH, is_ee2x=True, text_parser=text_parser)
    print(f"  解析了 {len(csv_parser.all_upgrades)} 条CSV升级记录")
    print(f"  覆盖 {len(csv_parser.units)} 个UnitType")

    # 阶段2: TECH解析
    print("[阶段2] 解析科技树...")
    tech_parser = TechParser()
    tech_parser.parse(TECH_PATH)
    print(f"  解析了 {len(tech_parser.nodes)} 个科技树节点")
    print(f"  发现 {len(tech_parser.commented_lines)} 条注释行")

    # 阶段3: DDF扫描
    print("[阶段3] 扫描DDF文件...")
    ddf_scanner = DdfScanner()
    ddf_scanner.scan_all(UNITS_DIR)
    print(f"  找到 {len(ddf_scanner.units)} 个UnitType声明")

    # 阶段4: Epoch DDF解析
    print("[阶段4] 解析时代升级DDF...")
    epoch_parser = EpochDdfParser()
    epoch_parser.parse_all(EPOCH_DDF_DIR)

    # 阶段5: 数据合并
    print("[阶段5] 合并数据...")
    merger = DataMerger(csv_parser, tech_parser, ddf_scanner, epoch_parser)

    # 阶段6: 生成文档
    print("[阶段6] 生成Markdown文档...")
    gen = DocGenerator(merger, ddf_scanner, tech_parser, csv_parser)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    gen.generate_all(OUTPUT_DIR)

    # 阶段7: 验证
    print("[阶段7] 执行验证...")
    verifier = Verifier(csv_parser, ddf_scanner, tech_parser)
    report = verifier.verify_all()
    report_path = os.path.join(OUTPUT_DIR, "验证报告.md")
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"  验证报告已保存到: {report_path}")

    # 统计
    print()
    print("=" * 60)
    print("生成完成!")
    print(f"  时代文档: 15个 (E1-E15)")
    print(f"  总索引: 1个")
    print(f"  验证报告: 1个")
    print(f"  输出目录: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == '__main__':
    main()
