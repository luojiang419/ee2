// Legacy publish/history helpers are intentionally kept for rollback while the UI runs in local bundle mode.
// ignore_for_file: unused_element, unused_field

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:ui';

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const Ee2xPublishToolApp());
}

const _buildId = String.fromEnvironment(
  'EE2X_BUILD_ID',
  defaultValue: 'dev-source',
);
const _buildTime = String.fromEnvironment(
  'EE2X_BUILD_TIME',
  defaultValue: 'source',
);
const _buildMarker = 'Build $_buildId · $_buildTime';
const _defaultVersion = '1.0.0';

enum PublishThemeMode { dark, light }

enum CatalogEntryKind { directory, file }

enum PackageScope { launcher, game }

enum CatalogPanelTab { browse, favorites, packageManager, serverVersions }

const _launcherProtectedPrefixes = <String>[
  '地球帝国二代远航版启动器/Config',
  '地球帝国二代远航版启动器/Logs',
  '地球帝国二代远航版启动器/data/userdata',
  '地球帝国二代远航版启动器/data/game-csv',
  '地球帝国二代远航版启动器/data/Settlement-img',
  '地球帝国二代远航版启动器/update/runtime',
];

List<Map<String, Object>> scanCatalogPayload(String rootPath) {
  final rootDir = Directory(rootPath);
  final entries = <Map<String, Object>>[];
  final stack = <Directory>[rootDir];
  final seen = <String>{rootDir.path};
  while (stack.isNotEmpty) {
    final current = stack.removeLast();
    final children = current.listSync(followLinks: false).toList()
      ..sort((left, right) {
        final leftIsDir = left is Directory;
        final rightIsDir = right is Directory;
        if (leftIsDir != rightIsDir) {
          return leftIsDir ? -1 : 1;
        }
        return p
            .basename(left.path)
            .toLowerCase()
            .compareTo(p.basename(right.path).toLowerCase());
      });
    for (final entity in children) {
      final relative = p
          .relative(entity.path, from: rootDir.path)
          .replaceAll('\\', '/');
      if (relative.isEmpty || relative == '.') {
        continue;
      }
      final kind = entity is Directory ? 'directory' : 'file';
      final scope =
          relative == '地球帝国二代远航版启动器' || relative.startsWith('地球帝国二代远航版启动器/')
          ? 'launcher'
          : 'game';
      final depth = relative.split('/').length - 1;
      entries.add({
        'relativePath': relative,
        'absolutePath': entity.path,
        'kind': kind,
        'scope': scope,
        'depth': depth,
      });
      if (entity is Directory && seen.add(entity.path)) {
        stack.add(entity);
      }
    }
  }
  return entries;
}

DateTime? _parseStructuredBundleTimestamp(String raw) {
  final match = RegExp(r'^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$')
      .firstMatch(raw);
  if (match == null) {
    return null;
  }
  try {
    return DateTime(
      int.parse(match.group(1)!),
      int.parse(match.group(2)!),
      int.parse(match.group(3)!),
      int.parse(match.group(4)!),
      int.parse(match.group(5)!),
      int.parse(match.group(6)!),
    );
  } catch (_) {
    return null;
  }
}

List<Map<String, Object?>> scanLocalBundlePayload(String directoryPath) {
  final directory = Directory(directoryPath);
  if (!directory.existsSync()) {
    return const [];
  }

  final entries = <Map<String, Object?>>[];
  final bundleNamePattern =
      RegExp(r'^ee2x-(.+)-(\d{8}-\d{6})\.zip$', caseSensitive: false);

  for (final entity in directory.listSync(followLinks: false)) {
    if (entity is! File) {
      continue;
    }
    final fileName = p.basename(entity.path);
    if (!fileName.toLowerCase().endsWith('.zip')) {
      continue;
    }
    final stat = entity.statSync();
    final match = bundleNamePattern.firstMatch(fileName);
    final namedTimestamp = match == null
        ? null
        : _parseStructuredBundleTimestamp(match.group(2)!);
    entries.add({
      'fileName': fileName,
      'absolutePath': entity.path,
      'versionLabel': match == null ? '未知版本' : match.group(1)!,
      'parsedVersion': match == null ? '' : match.group(1)!,
      'modifiedAtMs': stat.modified.millisecondsSinceEpoch,
      'sizeBytes': stat.size,
      'isStructuredName': match != null,
      'bundleTimestampMs': namedTimestamp?.millisecondsSinceEpoch,
    });
  }

  entries.sort(
    (left, right) => (right['modifiedAtMs'] as int).compareTo(
      left['modifiedAtMs'] as int,
    ),
  );
  return entries;
}

class WorkspaceContext {
  const WorkspaceContext({
    required this.repoRoot,
    required this.updaterDir,
    required this.gameRoot,
    required this.publishConfigPath,
    required this.preferencePath,
    required this.pythonPath,
  });

  final Directory repoRoot;
  final Directory updaterDir;
  final Directory gameRoot;
  final File publishConfigPath;
  final File preferencePath;
  final Directory pythonPath;
}

class WorkspaceLocator {
  static Future<WorkspaceContext> locate() async {
    final starts = <Directory>[
      Directory.current,
      File(Platform.resolvedExecutable).parent,
      File(Platform.script.toFilePath()).parent,
    ];
    final visited = <String>{};
    for (final start in starts) {
      var cursor = start.absolute;
      for (var depth = 0; depth < 10; depth++) {
        final key = cursor.path;
        if (visited.add(key)) {
          final updaterDir = Directory(p.join(cursor.path, '更新器'));
          final gameRoot = Directory(p.join(cursor.path, 'Empire Earth II'));
          if (updaterDir.existsSync() && gameRoot.existsSync()) {
            return WorkspaceContext(
              repoRoot: cursor,
              updaterDir: updaterDir,
              gameRoot: gameRoot,
              publishConfigPath: File(
                p.join(updaterDir.path, 'config', 'publish.local.json'),
              ),
              preferencePath: File(
                p.join(updaterDir.path, 'config', 'flutter_publish_tool.json'),
              ),
              pythonPath: Directory(p.join(updaterDir.path, 'src')),
            );
          }
        }
        final parent = cursor.parent;
        if (parent.path == cursor.path) {
          break;
        }
        cursor = parent;
      }
    }
    throw StateError('未找到包含 “更新器” 与 “Empire Earth II” 的工程根目录。');
  }
}

class CatalogEntry {
  const CatalogEntry({
    required this.relativePath,
    required this.absolutePath,
    required this.kind,
    required this.scope,
    required this.depth,
  });

  final String relativePath;
  final String absolutePath;
  final CatalogEntryKind kind;
  final PackageScope scope;
  final int depth;

  String get displayName => p.basename(relativePath);
}

class CatalogTreeNode {
  CatalogTreeNode({
    required this.relativePath,
    required this.displayName,
    required this.kind,
    required this.scope,
    this.children = const [],
    this.isExpanded = false,
    this.isChecked = false,
    this.isIndeterminate = false,
  });

  final String relativePath;
  final String displayName;
  final CatalogEntryKind kind;
  final PackageScope scope;
  List<CatalogTreeNode> children;
  bool isExpanded;
  bool isChecked;
  bool isIndeterminate;

  bool get isDirectory => kind == CatalogEntryKind.directory;
  bool get isFile => kind == CatalogEntryKind.file;
}

class VisibleTreeNode {
  const VisibleTreeNode({required this.node, required this.level});

  final CatalogTreeNode node;
  final int level;
}

class FavoriteEntryView {
  const FavoriteEntryView({required this.relativePath, required this.entry});

  final String relativePath;
  final CatalogEntry? entry;

  bool get exists => entry != null;

  String get displayName => entry?.displayName ?? p.basename(relativePath);

  PackageScope get scope {
    if (entry != null) {
      return entry!.scope;
    }
    return relativePath == '地球帝国二代远航版启动器' ||
            relativePath.startsWith('地球帝国二代远航版启动器/')
        ? PackageScope.launcher
        : PackageScope.game;
  }

  CatalogEntryKind? get kind => entry?.kind;
}

class RemoteInfo {
  const RemoteInfo({
    required this.channel,
    required this.publicBaseUrl,
    required this.latestUrl,
    required this.latestVersion,
    required this.nextVersion,
  });

  final String channel;
  final String publicBaseUrl;
  final String latestUrl;
  final String latestVersion;
  final String nextVersion;

  factory RemoteInfo.fromJson(Map<String, dynamic> json) {
    return RemoteInfo(
      channel: json['channel'] as String? ?? 'stable',
      publicBaseUrl: json['publicBaseUrl'] as String? ?? '',
      latestUrl: json['latestUrl'] as String? ?? '',
      latestVersion: json['latestVersion'] as String? ?? '',
      nextVersion: json['nextVersion'] as String? ?? _defaultVersion,
    );
  }
}

class PublishResult {
  const PublishResult({
    required this.version,
    required this.latestUrl,
    required this.publishedAt,
    required this.packages,
    required this.launcherDeletedCount,
    required this.gameDeletedCount,
    required this.launcherFileCount,
    required this.gameFileCount,
  });

  final String version;
  final String latestUrl;
  final String publishedAt;
  final Map<String, Map<String, dynamic>> packages;
  final int launcherDeletedCount;
  final int gameDeletedCount;
  final int launcherFileCount;
  final int gameFileCount;

  factory PublishResult.fromJson(Map<String, dynamic> json) {
    final publish = json['publish'] as Map<String, dynamic>? ?? const {};
    final packages = <String, Map<String, dynamic>>{};
    final rawPackages =
        publish['packages'] as Map<String, dynamic>? ?? const {};
    for (final entry in rawPackages.entries) {
      packages[entry.key] = Map<String, dynamic>.from(entry.value as Map);
    }
    return PublishResult(
      version: publish['version'] as String? ?? '',
      latestUrl: publish['latestUrl'] as String? ?? '',
      publishedAt: publish['publishedAt'] as String? ?? '',
      packages: packages,
      launcherDeletedCount: json['launcherDeletedCount'] as int? ?? 0,
      gameDeletedCount: json['gameDeletedCount'] as int? ?? 0,
      launcherFileCount: json['launcherFileCount'] as int? ?? 0,
      gameFileCount: json['gameFileCount'] as int? ?? 0,
    );
  }
}

class BundleExportResult {
  const BundleExportResult({
    required this.version,
    required this.releaseId,
    required this.bundlePath,
    required this.bundleSize,
    required this.launcherFileCount,
    required this.gameFileCount,
    required this.launcherDeletedCount,
    required this.gameDeletedCount,
    required this.launcherTriggersSelfUpdate,
  });

  final String version;
  final String releaseId;
  final String bundlePath;
  final int bundleSize;
  final int launcherFileCount;
  final int gameFileCount;
  final int launcherDeletedCount;
  final int gameDeletedCount;
  final bool launcherTriggersSelfUpdate;

  factory BundleExportResult.fromJson(Map<String, dynamic> json) {
    return BundleExportResult(
      version: json['version'] as String? ?? '',
      releaseId: json['releaseId'] as String? ?? '',
      bundlePath: json['bundlePath'] as String? ?? '',
      bundleSize: json['bundleSize'] as int? ?? 0,
      launcherFileCount: json['launcherFileCount'] as int? ?? 0,
      gameFileCount: json['gameFileCount'] as int? ?? 0,
      launcherDeletedCount: json['launcherDeletedCount'] as int? ?? 0,
      gameDeletedCount: json['gameDeletedCount'] as int? ?? 0,
      launcherTriggersSelfUpdate:
          json['launcherTriggersSelfUpdate'] as bool? ?? false,
    );
  }
}

class LocalBundleEntry {
  const LocalBundleEntry({
    required this.fileName,
    required this.absolutePath,
    required this.versionLabel,
    required this.parsedVersion,
    required this.modifiedAt,
    required this.sizeBytes,
    required this.isStructuredName,
    this.bundleTimestamp,
  });

  final String fileName;
  final String absolutePath;
  final String versionLabel;
  final String parsedVersion;
  final DateTime modifiedAt;
  final int sizeBytes;
  final bool isStructuredName;
  final DateTime? bundleTimestamp;

  String get directoryPath => p.dirname(absolutePath);

  factory LocalBundleEntry.fromJson(Map<String, Object?> json) {
    return LocalBundleEntry(
      fileName: json['fileName'] as String? ?? '',
      absolutePath: json['absolutePath'] as String? ?? '',
      versionLabel: json['versionLabel'] as String? ?? '未知版本',
      parsedVersion: json['parsedVersion'] as String? ?? '',
      modifiedAt: DateTime.fromMillisecondsSinceEpoch(
        json['modifiedAtMs'] as int? ?? 0,
      ),
      sizeBytes: json['sizeBytes'] as int? ?? 0,
      isStructuredName: json['isStructuredName'] as bool? ?? false,
      bundleTimestamp: (json['bundleTimestampMs'] as int?) == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(
              json['bundleTimestampMs'] as int,
            ),
    );
  }
}

class SelectionSummary {
  const SelectionSummary({
    required this.selectedPaths,
    required this.selectedIntentPaths,
    required this.launcherEntries,
    required this.gameEntries,
  });

  final List<String> selectedPaths;
  final List<String> selectedIntentPaths;
  final List<CatalogEntry> launcherEntries;
  final List<CatalogEntry> gameEntries;

  bool get hasContent => selectedPaths.isNotEmpty;
}

enum ActionMessageTone { success, warning, error }

class ReleaseHistoryEntry {
  const ReleaseHistoryEntry({
    required this.releaseId,
    required this.version,
    required this.generatedAt,
    required this.notes,
    required this.launcherFileCount,
    required this.gameFileCount,
    required this.launcherDeletedCount,
    required this.gameDeletedCount,
  });

  final String releaseId;
  final String version;
  final String generatedAt;
  final String notes;
  final int launcherFileCount;
  final int gameFileCount;
  final int launcherDeletedCount;
  final int gameDeletedCount;

  factory ReleaseHistoryEntry.fromJson(Map<String, dynamic> json) {
    return ReleaseHistoryEntry(
      releaseId: json['releaseId'] as String? ?? '',
      version: json['version'] as String? ?? '',
      generatedAt: json['generatedAt'] as String? ?? '',
      notes: json['notes'] as String? ?? '',
      launcherFileCount: json['launcherFileCount'] as int? ?? 0,
      gameFileCount: json['gameFileCount'] as int? ?? 0,
      launcherDeletedCount: json['launcherDeletedCount'] as int? ?? 0,
      gameDeletedCount: json['gameDeletedCount'] as int? ?? 0,
    );
  }
}

class PublishBackendRuntimeConfig {
  const PublishBackendRuntimeConfig({
    required this.backendBaseUrl,
    required this.publishToken,
    required this.channel,
  });

  final String backendBaseUrl;
  final String publishToken;
  final String channel;
}

class BridgeRunner {
  const BridgeRunner(this.workspace);

  final WorkspaceContext workspace;

  List<File> _bridgeSidecarCandidates() {
    final candidates = <String>[
      p.join(File(Platform.resolvedExecutable).parent.path, 'ee2x-bridge.exe'),
      p.join(Directory.current.path, 'ee2x-bridge.exe'),
      p.join(
        workspace.updaterDir.path,
        'dist',
        'ee2x-flutter-publisher',
        'ee2x-bridge.exe',
      ),
      p.join(
        workspace.updaterDir.path,
        'dist',
        'ee2x-flutter-publisher-next',
        'ee2x-bridge.exe',
      ),
    ];
    final seen = <String>{};
    return candidates
        .map((path) => File(path))
        .where((file) => seen.add(file.path))
        .toList();
  }

  Future<Map<String, dynamic>> runJson(List<String> args) async {
    final attempts = Platform.isWindows
        ? const [
            ['py', '-3'],
            ['python'],
            ['python3'],
          ]
        : const [
            ['python3'],
            ['python'],
          ];
    final environment = Map<String, String>.from(Platform.environment)
      ..['PYTHONPATH'] = workspace.pythonPath.path
      ..['EE2X_UPDATER_WORKSPACE'] = workspace.updaterDir.path;

    Map<String, dynamic>? decodeResult(ProcessResult result) {
      final stdoutText = result.stdout.toString().trim();
      if (stdoutText.isEmpty) {
        return null;
      }
      final decoded = jsonDecode(stdoutText);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return null;
    }

    final sidecars = Platform.isWindows
        ? _bridgeSidecarCandidates()
        : const <File>[];
    final existingSidecar = sidecars.cast<File?>().firstWhere(
      (file) => file != null && file.existsSync(),
      orElse: () => null,
    );

    if (existingSidecar != null) {
      try {
        final result = await Process.run(
          existingSidecar.path,
          args,
          workingDirectory: workspace.repoRoot.path,
          environment: environment,
        );
        final decoded = decodeResult(result);
        final stderrText = result.stderr.toString().trim();
        if (decoded != null) {
          if (result.exitCode != 0 && decoded['ok'] != true) {
            throw StateError(decoded['error'] as String? ?? stderrText);
          }
          return decoded;
        }
        if (result.exitCode == 0) {
          return const {'ok': true};
        }
        throw StateError(
          stderrText.isNotEmpty
              ? '内置 bridge.exe 执行失败: $stderrText'
              : '内置 bridge.exe 返回了异常状态。',
        );
      } on ProcessException catch (error) {
        throw StateError('内置 bridge.exe 无法启动: ${error.message}');
      } on FormatException catch (_) {
        throw StateError('内置 bridge.exe 输出了无法解析的 JSON。');
      }
    }

    String failureMessage = Platform.isWindows
        ? '缺少内置 bridge 可执行文件：${sidecars.first.path}'
        : '未能调用 Python bridge。';
    for (final attempt in attempts) {
      final executable = attempt.first;
      final prefix = attempt.sublist(1);
      try {
        final result = await Process.run(
          executable,
          [...prefix, '-m', 'ee2x_update_suite.bridge', ...args],
          workingDirectory: workspace.repoRoot.path,
          environment: environment,
        );
        final stderrText = result.stderr.toString().trim();
        final decoded = decodeResult(result);
        if (decoded != null) {
          if (result.exitCode != 0 && (decoded['ok'] != true)) {
            throw StateError(decoded['error'] as String? ?? stderrText);
          }
          return decoded;
        }
        if (result.exitCode == 0) {
          return const {'ok': true};
        }
        failureMessage = stderrText.isNotEmpty
            ? stderrText
            : 'Python bridge 返回了异常状态。';
      } on ProcessException catch (error) {
        failureMessage = Platform.isWindows
            ? '缺少内置 bridge 可执行文件，且开发环境未找到 $executable: ${error.message}'
            : error.message;
        continue;
      } on FormatException catch (_) {
        failureMessage = 'Python bridge 输出了无法解析的 JSON。';
      }
    }
    throw StateError(failureMessage);
  }
}

class GlassPalette {
  const GlassPalette({
    required this.backgroundTop,
    required this.backgroundBottom,
    required this.glowA,
    required this.glowB,
    required this.panel,
    required this.panelBorder,
    required this.panelShadow,
    required this.primaryText,
    required this.secondaryText,
    required this.accent,
    required this.accentSoft,
    required this.successSoft,
    required this.warningSoft,
    required this.dangerSoft,
    required this.inputFill,
  });

  final Color backgroundTop;
  final Color backgroundBottom;
  final Color glowA;
  final Color glowB;
  final Color panel;
  final Color panelBorder;
  final Color panelShadow;
  final Color primaryText;
  final Color secondaryText;
  final Color accent;
  final Color accentSoft;
  final Color successSoft;
  final Color warningSoft;
  final Color dangerSoft;
  final Color inputFill;
}

const _darkPalette = GlassPalette(
  backgroundTop: Color(0xFF08111E),
  backgroundBottom: Color(0xFF132742),
  glowA: Color(0xFF1C6DD0),
  glowB: Color(0xFFE07A5F),
  panel: Color(0xAA0F1C2B),
  panelBorder: Color(0x55B4D4FF),
  panelShadow: Color(0x66040B14),
  primaryText: Color(0xFFF3F6FB),
  secondaryText: Color(0xFFB6C4D8),
  accent: Color(0xFF7FD1FF),
  accentSoft: Color(0x337FD1FF),
  successSoft: Color(0x334FCB90),
  warningSoft: Color(0x33FFBE5C),
  dangerSoft: Color(0x33FF7875),
  inputFill: Color(0x66203043),
);

const _lightPalette = GlassPalette(
  backgroundTop: Color(0xFFE6EEF8),
  backgroundBottom: Color(0xFFF7F3EE),
  glowA: Color(0xFF4B87D9),
  glowB: Color(0xFFCF6C45),
  panel: Color(0xBFFAFDFF),
  panelBorder: Color(0x66A9C0DD),
  panelShadow: Color(0x220F2A45),
  primaryText: Color(0xFF152435),
  secondaryText: Color(0xFF516173),
  accent: Color(0xFF2367B1),
  accentSoft: Color(0x222367B1),
  successSoft: Color(0x2242B77C),
  warningSoft: Color(0x22C48718),
  dangerSoft: Color(0x22D65A54),
  inputFill: Color(0xCCF4F8FC),
);

class Ee2xPublishToolApp extends StatefulWidget {
  const Ee2xPublishToolApp({super.key});

  @override
  State<Ee2xPublishToolApp> createState() => _Ee2xPublishToolAppState();
}

class _Ee2xPublishToolAppState extends State<Ee2xPublishToolApp> {
  final GlobalKey<ScaffoldMessengerState> _scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();
  WorkspaceContext? _workspace;
  BridgeRunner? _bridge;
  PublishThemeMode _themeMode = PublishThemeMode.dark;
  RemoteInfo? _remoteInfo;
  BundleExportResult? _lastResult;

  final TextEditingController _rootController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _versionController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  final ScrollController _catalogScrollController = ScrollController();

  final Map<String, bool> _selectedPaths = <String, bool>{};
  final Map<String, CatalogEntry> _entryByPath = <String, CatalogEntry>{};
  final Map<String, CatalogTreeNode> _treeNodeByPath =
      <String, CatalogTreeNode>{};
  final Map<String, GlobalKey> _catalogItemKeys = <String, GlobalKey>{};
  final List<String> _favoritePaths = <String>[];
  List<CatalogEntry> _catalog = const [];
  List<CatalogTreeNode> _treeRoots = const [];
  List<LocalBundleEntry> _localBundleEntries = const [];
  List<ReleaseHistoryEntry> _serverHistoryEntries = const [];
  CatalogPanelTab _catalogTab = CatalogPanelTab.favorites;
  String? _pendingRevealPath;
  String _serverChannel = '';
  String _serverCurrentReleaseId = '';
  String _serverCurrentVersion = '';
  String _serverLatestUrl = '';

  bool _loadingWorkspace = true;
  bool _scanningCatalog = false;
  bool _loadingRemoteInfo = false;
  bool _loadingHistory = false;
  bool _loadingLocalBundles = false;
  bool _loadingServerVersions = false;
  bool _publishing = false;
  String? _errorMessage;
  String? _actionMessage;
  String? _localBundleError;
  String? _serverVersionsError;
  ActionMessageTone _actionMessageTone = ActionMessageTone.success;
  String _publishStageText = '';
  double? _publishProgress;
  String _publishProgressLabel = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_onStateChanged);
    _versionController.addListener(_onStateChanged);
    unawaited(_bootstrap());
  }

  @override
  void dispose() {
    _rootController.dispose();
    _searchController.dispose();
    _versionController.dispose();
    _notesController.dispose();
    _catalogScrollController.dispose();
    super.dispose();
  }

  bool get _shouldAcceptSuggestedVersion {
    final current = _versionController.text.trim();
    if (current.isEmpty) {
      return true;
    }
    final normalized = _tryNormalizeVersionString(current);
    return normalized == null || normalized == _defaultVersion;
  }

  Future<void> _bootstrap() async {
    try {
      final workspace = await WorkspaceLocator.locate();
      _workspace = workspace;
      _bridge = BridgeRunner(workspace);
      await _loadPreferences();
      if (_rootController.text.trim().isEmpty) {
        _rootController.text = workspace.gameRoot.path;
      }
      if (_versionController.text.trim().isEmpty) {
        _versionController.text = _defaultVersion;
      }
      await _refreshRemoteInfo();
      await _scanCatalog();
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      if (mounted) {
        setState(() {
          _loadingWorkspace = false;
        });
      }
    }
  }

  Future<void> _loadPreferences() async {
    final workspace = _workspace;
    if (workspace == null) {
      return;
    }
    final file = workspace.preferencePath;
    if (!file.existsSync()) {
      return;
    }
    final json = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
    final themeName = json['themeMode'] as String? ?? 'dark';
    final rootPath = json['rootPath'] as String? ?? '';
    final favoritePaths = <String>[];
    final rawFavorites = json['favoritesPaths'];
    if (rawFavorites is List) {
      final seen = <String>{};
      for (final item in rawFavorites) {
        final normalized = _normalizeRelativePath('$item');
        if (normalized.isEmpty || !seen.add(normalized)) {
          continue;
        }
        favoritePaths.add(normalized);
      }
    }
    setState(() {
      _themeMode = themeName == 'light'
          ? PublishThemeMode.light
          : PublishThemeMode.dark;
      if (rootPath.isNotEmpty) {
        _rootController.text = rootPath;
      }
      _favoritePaths
        ..clear()
        ..addAll(favoritePaths);
    });
  }

  Future<void> _savePreferences() async {
    final workspace = _workspace;
    if (workspace == null) {
      return;
    }
    final payload = {
      'themeMode': _themeMode.name,
      'rootPath': _rootController.text.trim(),
      'favoritesPaths': List<String>.from(_favoritePaths),
    };
    await workspace.preferencePath.parent.create(recursive: true);
    await workspace.preferencePath.writeAsString(
      const JsonEncoder.withIndent('  ').convert(payload),
      encoding: utf8,
    );
  }

  Future<void> _refreshRemoteInfo() async {
    final bridge = _bridge;
    final workspace = _workspace;
    if (bridge == null || workspace == null) {
      return;
    }
    setState(() {
      _loadingRemoteInfo = true;
    });
    try {
      final payload = await bridge.runJson([
        'remote-info',
        '--config',
        workspace.publishConfigPath.path,
      ]);
      if (payload['ok'] == true) {
        setState(() {
          final remoteInfo = RemoteInfo.fromJson(payload);
          _remoteInfo = remoteInfo;
          if (_shouldAcceptSuggestedVersion) {
            _versionController.text = remoteInfo.nextVersion;
          }
        });
      }
    } catch (error) {
      _setActionMessage('读取远端版本失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('读取远端版本失败: $error');
    } finally {
      if (mounted) {
        setState(() {
          _loadingRemoteInfo = false;
        });
      }
    }
  }

  Future<void> _scanCatalog() async {
    final rootPath = _rootController.text.trim();
    if (rootPath.isEmpty) {
      return;
    }
    final rootDir = Directory(rootPath);
    if (!rootDir.existsSync()) {
      _setActionMessage('游戏根目录不存在: $rootPath', tone: ActionMessageTone.error);
      _showSnackBar('游戏根目录不存在: $rootPath');
      return;
    }
    setState(() {
      _scanningCatalog = true;
      _lastResult = null;
    });
    try {
      final previousExpandedPaths = _treeNodeByPath.values
          .where((node) => node.isDirectory && node.isExpanded)
          .map((node) => node.relativePath)
          .toSet();
      final previousSelectedLeafPaths = _collectSelectedLeafPaths();
      final catalog = await _buildCatalog(rootDir);
      final entryByPath = {
        for (final entry in catalog) entry.relativePath: entry,
      };
      final treeRoots = _buildTree(
        catalog,
        previousExpandedPaths,
        previousSelectedLeafPaths,
      );
      setState(() {
        _catalog = catalog;
        _entryByPath
          ..clear()
          ..addAll(entryByPath);
        _treeRoots = treeRoots;
        _selectedPaths
          ..clear()
          ..addAll({
            for (final path in previousSelectedLeafPaths.where(
              entryByPath.containsKey,
            ))
              path: true,
          });
        _treeNodeByPath
          ..clear()
          ..addEntries(
            _flattenTreeNodes(
              treeRoots,
            ).map((node) => MapEntry(node.relativePath, node)),
          );
        _catalogItemKeys.removeWhere(
          (relativePath, _) => !entryByPath.containsKey(relativePath),
        );
      });
      await _savePreferences();
    } catch (error) {
      _setActionMessage('扫描目录失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('扫描目录失败: $error');
    } finally {
      if (mounted) {
        setState(() {
          _scanningCatalog = false;
        });
      }
    }
  }

  Future<List<CatalogEntry>> _buildCatalog(Directory rootDir) async {
    final payload = await Isolate.run(() => scanCatalogPayload(rootDir.path));
    return payload
        .map(
          (item) => CatalogEntry(
            relativePath: item['relativePath'] as String? ?? '',
            absolutePath: item['absolutePath'] as String? ?? '',
            kind: (item['kind'] as String? ?? '') == 'directory'
                ? CatalogEntryKind.directory
                : CatalogEntryKind.file,
            scope: (item['scope'] as String? ?? '') == 'launcher'
                ? PackageScope.launcher
                : PackageScope.game,
            depth: item['depth'] as int? ?? 0,
          ),
        )
        .where((entry) => entry.relativePath.isNotEmpty)
        .toList();
  }

  String _normalizeRelativePath(String value) {
    var normalized = value.replaceAll('\\', '/').trim();
    while (normalized.startsWith('/')) {
      normalized = normalized.substring(1);
    }
    while (normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }

  List<CatalogTreeNode> _buildTree(
    List<CatalogEntry> catalog,
    Set<String> expandedPaths,
    Set<String> selectedLeafPaths,
  ) {
    final nodes = <String, CatalogTreeNode>{};
    for (final entry in catalog) {
      nodes[entry.relativePath] = CatalogTreeNode(
        relativePath: entry.relativePath,
        displayName: entry.displayName,
        kind: entry.kind,
        scope: entry.scope,
        isExpanded: expandedPaths.contains(entry.relativePath),
        isChecked:
            entry.kind == CatalogEntryKind.file &&
            selectedLeafPaths.contains(entry.relativePath),
      );
    }

    final roots = <CatalogTreeNode>[];
    for (final entry in catalog) {
      final node = nodes[entry.relativePath]!;
      final parentPath = _parentRelativePath(entry.relativePath);
      if (parentPath == null || !nodes.containsKey(parentPath)) {
        roots.add(node);
      } else {
        final parentNode = nodes[parentPath];
        if (parentNode != null) {
          parentNode.children = [...parentNode.children, node];
        } else {
          roots.add(node);
        }
      }
    }

    for (final node in nodes.values) {
      if (node.children.isNotEmpty) {
        node.children.sort((left, right) {
          if (left.isDirectory != right.isDirectory) {
            return left.isDirectory ? -1 : 1;
          }
          return left.displayName.toLowerCase().compareTo(
            right.displayName.toLowerCase(),
          );
        });
      }
    }
    roots.sort((left, right) {
      if (left.isDirectory != right.isDirectory) {
        return left.isDirectory ? -1 : 1;
      }
      return left.displayName.toLowerCase().compareTo(
        right.displayName.toLowerCase(),
      );
    });
    _recomputeTreeSelectionState(roots);
    return roots;
  }

  String? _parentRelativePath(String relativePath) {
    final normalized = relativePath.replaceAll('\\', '/');
    final parts = normalized.split('/');
    if (parts.length <= 1) {
      return null;
    }
    return parts.sublist(0, parts.length - 1).join('/');
  }

  Set<String> _collectSelectedLeafPaths() {
    if (_treeNodeByPath.isEmpty) {
      return _selectedPaths.entries
          .where((entry) => entry.value)
          .map((entry) => entry.key)
          .toSet();
    }
    return _treeNodeByPath.values
        .where((node) => node.isFile && node.isChecked)
        .map((node) => node.relativePath)
        .toSet();
  }

  Set<String> _collectSelectedIntentPaths() {
    if (_treeNodeByPath.isEmpty) {
      return _collectSelectedLeafPaths();
    }
    final selected = <String>{};
    void visit(CatalogTreeNode node) {
      if (node.isChecked && !node.isIndeterminate) {
        selected.add(node.relativePath);
        return;
      }
      for (final child in node.children) {
        visit(child);
      }
    }

    for (final root in _treeRoots) {
      visit(root);
    }
    return selected;
  }

  List<CatalogTreeNode> _flattenTreeNodes(List<CatalogTreeNode> roots) {
    final flattened = <CatalogTreeNode>[];
    void visit(CatalogTreeNode node) {
      flattened.add(node);
      for (final child in node.children) {
        visit(child);
      }
    }

    for (final root in roots) {
      visit(root);
    }
    return flattened;
  }

  void _recomputeTreeSelectionState(List<CatalogTreeNode> roots) {
    bool visit(CatalogTreeNode node) {
      if (node.isFile) {
        node.isIndeterminate = false;
        return node.isChecked;
      }
      if (node.children.isEmpty) {
        node.isIndeterminate = false;
        return node.isChecked;
      }
      bool anySelected = false;
      bool allChecked = true;
      for (final child in node.children) {
        final childSelected = visit(child);
        anySelected = anySelected || childSelected || child.isIndeterminate;
        allChecked = allChecked && child.isChecked && !child.isIndeterminate;
      }
      node.isChecked = allChecked && anySelected;
      node.isIndeterminate = anySelected && !allChecked;
      return node.isChecked;
    }

    for (final root in roots) {
      visit(root);
    }
    _selectedPaths
      ..clear()
      ..addAll({
        for (final node in _flattenTreeNodes(roots))
          if (node.isFile && node.isChecked) node.relativePath: true,
      });
  }

  SelectionSummary get _selectionSummary {
    final selectedPaths = _collectSelectedLeafPaths().toList()..sort();
    final selectedIntentPaths = _collectSelectedIntentPaths().toList()..sort();
    final launcherEntries = <CatalogEntry>[];
    final gameEntries = <CatalogEntry>[];
    for (final path in selectedPaths) {
      final entry = _entryByPath[path];
      if (entry == null) {
        continue;
      }
      if (entry.scope == PackageScope.launcher) {
        launcherEntries.add(entry);
      } else {
        gameEntries.add(entry);
      }
    }
    return SelectionSummary(
      selectedPaths: selectedPaths,
      selectedIntentPaths: selectedIntentPaths,
      launcherEntries: launcherEntries,
      gameEntries: gameEntries,
    );
  }

  List<FavoriteEntryView> get _favoriteEntries => _favoritePaths
      .map(
        (relativePath) => FavoriteEntryView(
          relativePath: relativePath,
          entry: _entryByPath[relativePath],
        ),
      )
      .toList();

  bool _isFavorite(String relativePath) {
    final normalized = _normalizeRelativePath(relativePath);
    return _favoritePaths.contains(normalized);
  }

  Future<void> _toggleFavorite(String relativePath) async {
    final normalized = _normalizeRelativePath(relativePath);
    if (normalized.isEmpty) {
      return;
    }
    setState(() {
      if (_favoritePaths.contains(normalized)) {
        _favoritePaths.remove(normalized);
      } else {
        _favoritePaths.add(normalized);
      }
    });
    await _savePreferences();
  }

  Future<void> _removeFavorite(String relativePath) async {
    final normalized = _normalizeRelativePath(relativePath);
    if (!_favoritePaths.contains(normalized)) {
      return;
    }
    setState(() {
      _favoritePaths.remove(normalized);
    });
    await _savePreferences();
  }

  void _switchCatalogTab(CatalogPanelTab tab) {
    if (_catalogTab == tab) {
      return;
    }
    setState(() {
      _catalogTab = tab;
    });
    if (tab == CatalogPanelTab.packageManager) {
      unawaited(_refreshLocalBundles());
    } else if (tab == CatalogPanelTab.serverVersions) {
      unawaited(_loadServerVersions());
    }
  }

  bool _pathCanBeSelected(String relativePath) {
    return _treeNodeByPath.containsKey(relativePath);
  }

  bool? _selectionValueForPath(String relativePath) {
    final node = _treeNodeByPath[relativePath];
    if (node == null) {
      return false;
    }
    return node.isIndeterminate ? null : node.isChecked;
  }

  bool _nextSelectionValueForPath(String relativePath) {
    final node = _treeNodeByPath[relativePath];
    if (node == null) {
      return false;
    }
    return !(node.isChecked && !node.isIndeterminate);
  }

  void _revealPathInBrowseTab(String relativePath) {
    final normalized = _normalizeRelativePath(relativePath);
    final targetNode = _treeNodeByPath[normalized];
    if (targetNode == null) {
      _setActionMessage(
        '当前根目录下未找到收藏项：$normalized',
        tone: ActionMessageTone.warning,
      );
      return;
    }
    _searchController.text = '';
    var cursor = _parentRelativePath(normalized);
    while (cursor != null) {
      final node = _treeNodeByPath[cursor];
      if (node != null && node.isDirectory) {
        node.isExpanded = true;
      }
      cursor = _parentRelativePath(cursor);
    }
    if (targetNode.isDirectory) {
      targetNode.isExpanded = true;
    }
    setState(() {
      _catalogTab = CatalogPanelTab.browse;
      _pendingRevealPath = normalized;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _ensureCatalogItemVisible(normalized);
    });
  }

  void _ensureCatalogItemVisible(String relativePath) {
    final key = _catalogItemKeys[relativePath];
    final currentContext = key?.currentContext;
    if (currentContext == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _ensureCatalogItemVisible(relativePath);
      });
      return;
    }
    Scrollable.ensureVisible(
      currentContext,
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
      alignment: 0.18,
    );
    if (!mounted) {
      _pendingRevealPath = null;
      return;
    }
    setState(() {
      if (_pendingRevealPath == relativePath) {
        _pendingRevealPath = null;
      }
    });
  }

  void _toggleExpanded(CatalogTreeNode node) {
    if (!node.isDirectory) {
      return;
    }
    setState(() {
      node.isExpanded = !node.isExpanded;
    });
  }

  Future<void> _pickRootDirectory() async {
    final selectedPath = await getDirectoryPath(
      initialDirectory: _rootController.text.trim(),
    );
    if (selectedPath == null || selectedPath.isEmpty) {
      return;
    }
    _rootController.text = selectedPath;
    await _scanCatalog();
  }

  Future<void> _toggleTheme() async {
    setState(() {
      _themeMode = _themeMode == PublishThemeMode.dark
          ? PublishThemeMode.light
          : PublishThemeMode.dark;
    });
    await _savePreferences();
  }

  void _toggleSelection(String relativePath, bool selected) {
    final node = _treeNodeByPath[relativePath];
    if (node == null) {
      return;
    }
    setState(() {
      _setNodeSelectionRecursive(node, selected);
      _recomputeTreeSelectionState(_treeRoots);
    });
  }

  void _clearSelection() {
    setState(() {
      for (final node in _treeNodeByPath.values) {
        node.isChecked = false;
        node.isIndeterminate = false;
      }
      _selectedPaths.clear();
      _lastResult = null;
    });
  }

  void _setNodeSelectionRecursive(CatalogTreeNode node, bool selected) {
    node.isChecked = selected;
    node.isIndeterminate = false;
    for (final child in node.children) {
      _setNodeSelectionRecursive(child, selected);
    }
  }

  void _expandAll() {
    setState(() {
      for (final node in _treeNodeByPath.values) {
        if (node.isDirectory) {
          node.isExpanded = true;
        }
      }
    });
  }

  void _collapseAll() {
    setState(() {
      for (final node in _treeNodeByPath.values) {
        if (node.isDirectory) {
          node.isExpanded = false;
        }
      }
    });
  }

  void _applyLauncherSafePreset() {
    final launcherNode = _treeNodeByPath['地球帝国二代远航版启动器'];
    if (launcherNode == null) {
      _setActionMessage(
        '当前目录中未找到启动器根目录“地球帝国二代远航版启动器”。',
        tone: ActionMessageTone.error,
      );
      return;
    }
    setState(() {
      for (final node in _treeNodeByPath.values) {
        node.isChecked = false;
        node.isIndeterminate = false;
      }
      _setNodeSelectionRecursive(launcherNode, true);
      launcherNode.isExpanded = true;
      _recomputeTreeSelectionState(_treeRoots);
      _lastResult = null;
    });
    _setActionMessage(
      '已选择“导出启动器程序更新（自动排除本地状态）”预设。打包时会自动排除 Config / Logs / data/userdata / update/runtime 中的本地状态文件。',
      tone: ActionMessageTone.warning,
    );
  }

  String? _tryNormalizeVersionString(String rawValue) {
    final raw = rawValue.trim();
    if (raw.isEmpty) {
      return null;
    }
    try {
      return _normalizeVersionString(rawValue);
    } on FormatException {
      return null;
    }
  }

  String _formatDateTime(DateTime value) {
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    final second = value.second.toString().padLeft(2, '0');
    return '${value.year}-$month-$day $hour:$minute:$second';
  }

  Directory? get _localBundleDirectoryOrNull {
    final workspace = _workspace;
    if (workspace == null) {
      return null;
    }
    return _defaultBundleOutputDirectory(workspace);
  }

  Future<void> _refreshLocalBundles() async {
    final bundleDir = _localBundleDirectoryOrNull;
    if (bundleDir == null) {
      return;
    }
    setState(() {
      _loadingLocalBundles = true;
      _localBundleError = null;
    });
    try {
      await bundleDir.create(recursive: true);
      final payload = scanLocalBundlePayload(bundleDir.path);
      final entries = payload
          .map((item) => LocalBundleEntry.fromJson(item))
          .toList(growable: false);
      if (!mounted) {
        return;
      }
      setState(() {
        _localBundleEntries = entries;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _localBundleError = '读取本地更新包失败: $error';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingLocalBundles = false;
        });
      }
    }
  }

  Future<void> _openLocalBundleDirectory() async {
    final bundleDir = _localBundleDirectoryOrNull;
    if (bundleDir == null) {
      _setActionMessage('打包环境尚未初始化。', tone: ActionMessageTone.error);
      return;
    }
    try {
      await bundleDir.create(recursive: true);
      if (Platform.isWindows) {
        await Process.run('explorer.exe', [bundleDir.path]);
        return;
      }
      if (Platform.isMacOS) {
        await Process.run('open', [bundleDir.path]);
        return;
      }
      await Process.run('xdg-open', [bundleDir.path]);
    } catch (error) {
      _setActionMessage('打开更新包目录失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('打开更新包目录失败: $error');
    }
  }

  Future<void> _revealLocalBundle(LocalBundleEntry entry) async {
    try {
      if (Platform.isWindows) {
        final result = await Process.run('explorer.exe', [
          '/select,${entry.absolutePath}',
        ]);
        if (result.exitCode == 0) {
          return;
        }
        await Process.run('explorer.exe', [entry.directoryPath]);
        return;
      }
      if (Platform.isMacOS) {
        await Process.run('open', ['-R', entry.absolutePath]);
        return;
      }
      await Process.run('xdg-open', [entry.directoryPath]);
    } catch (error) {
      _setActionMessage('定位更新包失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('定位更新包失败: $error');
    }
  }

  Future<bool> _confirmDialog({
    required String title,
    required String message,
    required String confirmLabel,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: _palette.panel.withValues(alpha: 0.98),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
        ),
        title: Text(
          title,
          style: TextStyle(
            color: _palette.primaryText,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          message,
          style: TextStyle(color: _palette.primaryText, height: 1.55),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return result == true;
  }

  Future<void> _deleteLocalBundle(LocalBundleEntry entry) async {
    final confirmed = await _confirmDialog(
      title: '删除本地更新包',
      message: '确认删除 ${entry.fileName} 吗？\n\n这只会删除本地 ZIP 文件，不影响服务器版本。',
      confirmLabel: '确认删除',
    );
    if (!confirmed) {
      return;
    }
    try {
      final file = File(entry.absolutePath);
      if (file.existsSync()) {
        await file.delete();
      }
      if (_lastResult?.bundlePath == entry.absolutePath) {
        setState(() {
          _lastResult = null;
        });
      }
      await _refreshLocalBundles();
      _setActionMessage('已删除本地更新包 ${entry.fileName}。', tone: ActionMessageTone.success);
      _showSnackBar('已删除本地更新包 ${entry.fileName}。');
    } catch (error) {
      _setActionMessage('删除本地更新包失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('删除本地更新包失败: $error');
    }
  }

  Future<void> _saveLocalBundleAs(LocalBundleEntry entry) async {
    final sourceFile = File(entry.absolutePath);
    if (!sourceFile.existsSync()) {
      _setActionMessage('本地更新包已不存在，请先刷新列表。', tone: ActionMessageTone.error);
      _showSnackBar('本地更新包已不存在，请先刷新列表。');
      return;
    }
    final saveLocation = await getSaveLocation(
      suggestedName: entry.fileName,
      initialDirectory: sourceFile.parent.path,
      acceptedTypeGroups: const [
        XTypeGroup(label: 'ZIP 更新包', extensions: ['zip']),
      ],
    );
    if (saveLocation == null) {
      _setActionMessage('已取消另存更新包。', tone: ActionMessageTone.warning);
      return;
    }
    final targetPath = _ensureZipExtension(saveLocation.path);
    try {
      final targetFile = File(targetPath);
      if (targetFile.existsSync()) {
        await targetFile.delete();
      }
      await sourceFile.copy(targetPath);
      _setActionMessage(
        '已将 ${entry.fileName} 另存到 $targetPath。',
        tone: ActionMessageTone.success,
      );
      _showSnackBar('已另存更新包到 $targetPath。');
    } catch (error) {
      _setActionMessage('另存更新包失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('另存更新包失败: $error');
    }
  }

  Future<void> _loadServerVersions() async {
    setState(() {
      _loadingServerVersions = true;
      _serverVersionsError = null;
    });
    try {
      await _refreshRemoteInfo();
      final payload = await _fetchHistoryPayload(limit: 20);
      if (payload['ok'] != true) {
        throw StateError(payload['error'] as String? ?? '读取服务器版本失败');
      }
      final items = _parseReleaseHistoryItems(payload);
      if (!mounted) {
        return;
      }
      setState(() {
        _serverHistoryEntries = items;
        _serverChannel = '${payload['channel'] ?? _remoteInfo?.channel ?? ''}';
        _serverCurrentReleaseId = '${payload['currentReleaseId'] ?? ''}';
        _serverCurrentVersion = '${payload['currentVersion'] ?? ''}';
        _serverLatestUrl = _remoteInfo?.latestUrl ?? '';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _serverVersionsError = '读取服务器版本失败: $error';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingServerVersions = false;
        });
      }
    }
  }

  String? get _normalizedInputVersionForServerCheck =>
      _tryNormalizeVersionString(_versionController.text);

  List<ReleaseHistoryEntry> get _conflictingServerEntries {
    final normalizedInput = _normalizedInputVersionForServerCheck;
    if (normalizedInput == null) {
      return const [];
    }
    return _serverHistoryEntries.where((entry) {
      final normalizedEntry = _tryNormalizeVersionString(entry.version);
      return normalizedEntry != null && normalizedEntry == normalizedInput;
    }).toList(growable: false);
  }

  void _setActionMessage(String? message, {required ActionMessageTone tone}) {
    if (!mounted) {
      _actionMessage = message;
      _actionMessageTone = tone;
      return;
    }
    setState(() {
      _actionMessage = message;
      _actionMessageTone = tone;
    });
  }

  Future<Map<String, dynamic>> _fetchHistoryPayload({int limit = 20}) async {
    final remoteInfo = _remoteInfo;
    if (remoteInfo == null || remoteInfo.publicBaseUrl.trim().isEmpty) {
      throw StateError('后端地址未配置。');
    }
    final historyUrl =
        '${remoteInfo.publicBaseUrl}/api/update/v1/channels/${remoteInfo.channel}/history?limit=$limit';
    final client = HttpClient();
    try {
      final request = await client.getUrl(Uri.parse(historyUrl));
      final response = await request.close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw StateError('HTTP ${response.statusCode}');
      }
      return jsonDecode(await response.transform(utf8.decoder).join())
          as Map<String, dynamic>;
    } finally {
      client.close(force: true);
    }
  }

  List<ReleaseHistoryEntry> _parseReleaseHistoryItems(
    Map<String, dynamic> payload,
  ) {
    final rawHistory = payload['history'];
    if (rawHistory is! List) {
      return const [];
    }
    return rawHistory
        .whereType<Map>()
        .map(
          (entry) =>
              ReleaseHistoryEntry.fromJson(Map<String, dynamic>.from(entry)),
        )
        .toList();
  }

  Future<Map<String, dynamic>> _deleteRelease(String releaseId) async {
    final workspace = _workspace;
    final bridge = _bridge;
    if (workspace == null || bridge == null) {
      throw StateError('发布环境尚未初始化。');
    }
    return bridge.runJson([
      'delete-release',
      '--config',
      workspace.publishConfigPath.path,
      '--release-id',
      releaseId,
    ]);
  }

  Future<PublishBackendRuntimeConfig> _loadPublishRuntimeConfig() async {
    final workspace = _workspace;
    if (workspace == null) {
      throw StateError('发布环境尚未初始化。');
    }
    final payload =
        jsonDecode(
              await workspace.publishConfigPath.readAsString(encoding: utf8),
            )
            as Map<String, dynamic>;
    final backendBaseUrl =
        (payload['backendBaseUrl'] as String? ??
                payload['publicBaseUrl'] as String? ??
                '')
            .trim()
            .replaceAll(RegExp(r'/$'), '');
    if (backendBaseUrl.isEmpty) {
      throw StateError('发布配置缺少 backendBaseUrl。');
    }
    return PublishBackendRuntimeConfig(
      backendBaseUrl: backendBaseUrl,
      publishToken: (payload['publishToken'] as String? ?? '').trim(),
      channel: (payload['channel'] as String? ?? 'stable').trim().isEmpty
          ? 'stable'
          : (payload['channel'] as String? ?? 'stable').trim(),
    );
  }

  String _formatByteSize(num bytes) {
    final value = bytes.toDouble();
    if (value < 1024) {
      return '${value.toStringAsFixed(0)} B';
    }
    if (value < 1024 * 1024) {
      return '${(value / 1024).toStringAsFixed(1)} KB';
    }
    if (value < 1024 * 1024 * 1024) {
      return '${(value / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    return '${(value / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }

  Future<Map<String, dynamic>> _uploadReleaseDirWithProgress({
    required String releaseDirPath,
  }) async {
    final runtimeConfig = await _loadPublishRuntimeConfig();
    final releaseDir = Directory(releaseDirPath);
    final launcherManifestPath = File(
      p.join(releaseDir.path, 'launcher', 'release-manifest.json'),
    );
    final gameManifestPath = File(
      p.join(releaseDir.path, 'game', 'release-manifest.json'),
    );
    if (!launcherManifestPath.existsSync() || !gameManifestPath.existsSync()) {
      throw StateError('发布目录缺少 launcher/game manifest。');
    }

    final launcherManifest =
        jsonDecode(await launcherManifestPath.readAsString(encoding: utf8))
            as Map<String, dynamic>;
    final gameManifest =
        jsonDecode(await gameManifestPath.readAsString(encoding: utf8))
            as Map<String, dynamic>;
    final version =
        (gameManifest['version'] as String? ??
                launcherManifest['version'] as String? ??
                '')
            .trim();
    if (version.isEmpty) {
      throw StateError('发布目录缺少版本号。');
    }

    final launcherPackagePath = File(
      p.join(
        releaseDir.path,
        'launcher',
        (launcherManifest['packageFileName'] as String? ?? '').trim(),
      ),
    );
    final gamePackagePath = File(
      p.join(
        releaseDir.path,
        'game',
        (gameManifest['packageFileName'] as String? ?? '').trim(),
      ),
    );
    if (!launcherPackagePath.existsSync() || !gamePackagePath.existsSync()) {
      throw StateError('发布目录缺少 launcher/game package 文件。');
    }

    final notesPath = File(p.join(releaseDir.path, 'release-notes.txt'));
    final notes = notesPath.existsSync()
        ? await notesPath.readAsString(encoding: utf8)
        : '';

    final boundary = '----ee2x-${DateTime.now().microsecondsSinceEpoch}';
    final fields = <MapEntry<String, String>>[
      MapEntry('channel', runtimeConfig.channel),
      MapEntry('version', version),
      MapEntry('releaseNotes', notes.trim()),
      const MapEntry('required', 'true'),
    ];
    final files = <({String field, File file, String contentType})>[
      (
        field: 'launcherManifest',
        file: launcherManifestPath,
        contentType: 'application/json',
      ),
      (
        field: 'launcherPackage',
        file: launcherPackagePath,
        contentType: 'application/zip',
      ),
      (
        field: 'gameManifest',
        file: gameManifestPath,
        contentType: 'application/json',
      ),
      (
        field: 'gamePackage',
        file: gamePackagePath,
        contentType: 'application/zip',
      ),
    ];

    int contentLength = 0;
    List<int> fieldPart(String name, String value) => utf8.encode(
      '--$boundary\r\n'
      'Content-Disposition: form-data; name="$name"\r\n\r\n'
      '$value\r\n',
    );
    List<int> fileHeaderPart(
      String fieldName,
      File file,
      String contentType,
    ) => utf8.encode(
      '--$boundary\r\n'
      'Content-Disposition: form-data; name="$fieldName"; filename="${p.basename(file.path)}"\r\n'
      'Content-Type: $contentType\r\n\r\n',
    );
    const fileTail = [13, 10];
    final closing = utf8.encode('--$boundary--\r\n');

    for (final field in fields) {
      contentLength += fieldPart(field.key, field.value).length;
    }
    for (final filePart in files) {
      contentLength += fileHeaderPart(
        filePart.field,
        filePart.file,
        filePart.contentType,
      ).length;
      contentLength += await filePart.file.length();
      contentLength += fileTail.length;
    }
    contentLength += closing.length;

    final client = HttpClient();
    final stopwatch = Stopwatch()..start();
    var uploadedBytes = 0;
    var lastUiTick = DateTime.fromMillisecondsSinceEpoch(0);
    late HttpClientRequest clientRequest;

    void reportProgress({bool force = false}) {
      final now = DateTime.now();
      if (!force &&
          now.difference(lastUiTick).inMilliseconds < 120 &&
          uploadedBytes < contentLength) {
        return;
      }
      lastUiTick = now;
      final ratio = contentLength <= 0 ? 0.0 : uploadedBytes / contentLength;
      final seconds = stopwatch.elapsedMilliseconds <= 0
          ? 0.001
          : stopwatch.elapsedMilliseconds / 1000;
      final speed = uploadedBytes / seconds;
      if (!mounted) {
        return;
      }
      setState(() {
        _publishStageText = '正在上传发布包到服务器…';
        final progress = ratio.clamp(0.0, 1.0);
        _publishProgress = progress;
        _publishProgressLabel =
            '${(progress * 100).toStringAsFixed(1)}% · '
            '${_formatByteSize(uploadedBytes)} / ${_formatByteSize(contentLength)} · '
            '${_formatByteSize(speed)}/s';
      });
    }

    Future<void> writeChunk(List<int> chunk) async {
      uploadedBytes += chunk.length;
      clientRequest.add(chunk);
      reportProgress();
    }

    try {
      clientRequest = await client.postUrl(
        Uri.parse(
          '${runtimeConfig.backendBaseUrl}/api/update/v1/releases/publish',
        ),
      );
      clientRequest.headers.set(
        HttpHeaders.contentTypeHeader,
        'multipart/form-data; boundary=$boundary',
      );
      clientRequest.headers.set(
        HttpHeaders.contentLengthHeader,
        contentLength.toString(),
      );
      if (runtimeConfig.publishToken.isNotEmpty) {
        clientRequest.headers.set(
          HttpHeaders.authorizationHeader,
          'Bearer ${runtimeConfig.publishToken}',
        );
      }

      for (final field in fields) {
        await writeChunk(fieldPart(field.key, field.value));
      }
      for (final filePart in files) {
        await writeChunk(
          fileHeaderPart(filePart.field, filePart.file, filePart.contentType),
        );
        await for (final chunk in filePart.file.openRead()) {
          await writeChunk(chunk);
        }
        await writeChunk(fileTail);
      }
      await writeChunk(closing);
      reportProgress(force: true);

      final response = await clientRequest.close();
      final responseText = await response.transform(utf8.decoder).join();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw StateError(
          'HTTP ${response.statusCode}: ${responseText.isEmpty ? '发布失败' : responseText}',
        );
      }
      final decoded = jsonDecode(responseText);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      throw StateError('服务器返回了无法识别的响应。');
    } finally {
      client.close(force: true);
    }
  }

  Future<void> _openVersionHistory() async {
    final remoteInfo = _remoteInfo;
    if (remoteInfo == null || remoteInfo.publicBaseUrl.trim().isEmpty) {
      _setActionMessage('请先读取远端状态，再查看版本历史。', tone: ActionMessageTone.error);
      return;
    }
    setState(() {
      _loadingHistory = true;
    });
    try {
      final payload = await _fetchHistoryPayload(limit: 20);
      if (payload['ok'] == true) {
        final items = _parseReleaseHistoryItems(payload);
        if (!mounted) return;
        await showDialog<void>(
          context: context,
          builder: (context) => _buildHistoryDialog(
            channel: '${payload['channel'] ?? 'stable'}',
            latestUrl: remoteInfo.latestUrl,
            currentReleaseId: '${payload['currentReleaseId'] ?? ''}',
            currentVersion: '${payload['currentVersion'] ?? ''}',
            items: items,
          ),
        );
      }
    } catch (error) {
      _setActionMessage('读取版本历史失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('读取版本历史失败: $error');
    } finally {
      if (mounted) {
        setState(() {
          _loadingHistory = false;
        });
      }
    }
  }

  String _normalizeVersionString(
    String rawValue, {
    bool allowEmptyAsBase = false,
  }) {
    final raw = rawValue.trim();
    if (raw.isEmpty) {
      if (allowEmptyAsBase) {
        return _defaultVersion;
      }
      throw const FormatException('请填写版本号。');
    }

    var normalized = raw.replaceAll(RegExp(r'[。．｡]'), '.').trim();
    if (normalized.startsWith('v') || normalized.startsWith('V')) {
      normalized = normalized.substring(1).trim();
    }
    if (normalized.isEmpty) {
      throw const FormatException('请填写版本号。');
    }

    final parts = normalized.split('.');
    if (parts.length > 3) {
      throw const FormatException('版本号最多支持 3 段数字，请使用 x.y.z。');
    }

    final numbers = <String>[];
    for (final part in parts) {
      final item = part.trim();
      if (item.isEmpty) {
        throw const FormatException('版本号格式不正确，请使用 x.y.z。');
      }
      if (!RegExp(r'^\d+$').hasMatch(item)) {
        throw const FormatException('版本号只支持数字段，请使用 x.y.z。');
      }
      numbers.add('${int.parse(item)}');
    }
    while (numbers.length < 3) {
      numbers.add('0');
    }
    return numbers.take(3).join('.');
  }

  void _setVersionText(String value) {
    _versionController.value = TextEditingValue(
      text: value,
      selection: TextSelection.collapsed(offset: value.length),
    );
  }

  String? _normalizeVersionField({
    bool allowEmptyAsBase = false,
    bool showError = false,
  }) {
    try {
      final normalized = _normalizeVersionString(
        _versionController.text,
        allowEmptyAsBase: allowEmptyAsBase,
      );
      if (_versionController.text != normalized) {
        _setVersionText(normalized);
      }
      return normalized;
    } on FormatException catch (error) {
      if (showError) {
        _setActionMessage(error.message, tone: ActionMessageTone.error);
        _showSnackBar(error.message);
      }
      return null;
    }
  }

  void _adjustPatchVersion(int delta) {
    final normalized = _normalizeVersionField(
      allowEmptyAsBase: true,
      showError: true,
    );
    if (normalized == null) {
      return;
    }
    final parts = normalized
        .split('.')
        .map(int.parse)
        .toList(growable: false);
    var patch = parts[2];
    if (delta > 0) {
      patch += delta;
    } else if (delta < 0 && patch > 0) {
      patch = patch + delta;
      if (patch < 0) {
        patch = 0;
      }
    }
    _setVersionText('${parts[0]}.${parts[1]}.$patch');
  }

  Directory _defaultBundleOutputDirectory(WorkspaceContext workspace) {
    final executableDir = File(Platform.resolvedExecutable).parent;
    final bundledBridge = File(p.join(executableDir.path, 'ee2x-bridge.exe'));
    if (bundledBridge.existsSync()) {
      return Directory(p.join(executableDir.path, 'data', 'zip'));
    }
    return Directory(p.join(workspace.updaterDir.path, 'data', 'zip'));
  }

  String _bundleTimestamp(DateTime time) {
    final month = time.month.toString().padLeft(2, '0');
    final day = time.day.toString().padLeft(2, '0');
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    final second = time.second.toString().padLeft(2, '0');
    return '${time.year}$month$day-$hour$minute$second';
  }

  String _bundleFileName(String version, DateTime time) {
    return 'ee2x-$version-${_bundleTimestamp(time)}.zip';
  }

  String _ensureZipExtension(String rawPath) {
    return rawPath.toLowerCase().endsWith('.zip') ? rawPath : '$rawPath.zip';
  }

  Future<void> _saveLastBundleAs(BundleExportResult result) async {
    final sourceFile = File(result.bundlePath);
    if (!sourceFile.existsSync()) {
      const message = '默认保存目录中的更新包已不存在，请先重新生成后再另存。';
      _setActionMessage(message, tone: ActionMessageTone.error);
      _showSnackBar(message);
      return;
    }

    final saveLocation = await getSaveLocation(
      suggestedName: p.basename(sourceFile.path),
      initialDirectory: sourceFile.parent.path,
      acceptedTypeGroups: const [
        XTypeGroup(label: 'ZIP 更新包', extensions: ['zip']),
      ],
    );
    if (saveLocation == null) {
      _setActionMessage('已取消另存更新包。', tone: ActionMessageTone.warning);
      return;
    }

    final targetPath = _ensureZipExtension(saveLocation.path);
    final sourcePath = p.normalize(sourceFile.absolute.path);
    final normalizedTargetPath = p.normalize(targetPath);
    if (sourcePath == normalizedTargetPath) {
      _setActionMessage('当前更新包已经位于该位置。', tone: ActionMessageTone.success);
      _showSnackBar('当前更新包已经位于该位置。');
      return;
    }

    try {
      final targetFile = File(targetPath);
      if (targetFile.existsSync()) {
        await targetFile.delete();
      }
      await sourceFile.copy(targetPath);
      _setActionMessage(
        '已将更新包另存到 $targetPath。\n\n默认保存副本仍保留在 ${result.bundlePath}。',
        tone: ActionMessageTone.success,
      );
      _showSnackBar('已另存更新包到 $targetPath。');
    } catch (error) {
      _setActionMessage('另存更新包失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('另存更新包失败: $error');
    }
  }

  Future<void> _saveBundleFromMainForm() async {
    final workspace = _workspace;
    if (workspace == null) {
      _setActionMessage('打包环境尚未初始化。', tone: ActionMessageTone.error);
      return;
    }
    final summary = _selectionSummary;
    if (!summary.hasContent) {
      _setActionMessage('请至少勾选一个文件或文件夹。', tone: ActionMessageTone.error);
      _showSnackBar('请至少勾选一个文件或文件夹。');
      return;
    }
    final version = _normalizeVersionField(showError: true);
    final notes = _notesController.text.trim();
    if (version == null) {
      return;
    }
    final outputDir = _defaultBundleOutputDirectory(workspace);
    await outputDir.create(recursive: true);
    final outputPath = p.join(
      outputDir.path,
      _bundleFileName(version, DateTime.now()),
    );

    final bridge = _bridge;
    if (bridge == null) {
      _setActionMessage('Python bridge 尚未初始化。', tone: ActionMessageTone.error);
      return;
    }
    final tempDir = Directory(
      p.join(workspace.updaterDir.path, '.flutter_publish_tool_tmp'),
    );
    await tempDir.create(recursive: true);
    final token = DateTime.now().millisecondsSinceEpoch.toString();
    final selectionFile = File(p.join(tempDir.path, 'selection-$token.txt'));
    final notesFile = File(p.join(tempDir.path, 'notes-$token.txt'));

    setState(() {
      _publishing = true;
      _actionMessage = null;
      _publishStageText = '';
      _publishProgress = null;
      _publishProgressLabel = '';
    });
    try {
      _setActionMessage(
        '正在生成更新包并保存到默认 data/zip 目录，请稍候…',
        tone: ActionMessageTone.warning,
      );
      await selectionFile.writeAsString(
        summary.selectedIntentPaths.join('\n'),
        encoding: utf8,
      );
      await notesFile.writeAsString(notes, encoding: utf8);

      final prepared = await bridge.runJson([
        'export-bundle',
        '--root',
        _rootController.text.trim(),
        '--version',
        version,
        '--notes-file',
        notesFile.path,
        '--selection-file',
        selectionFile.path,
        '--output',
        outputPath,
      ]);

      if (prepared['ok'] != true) {
        final validation =
            prepared['validation'] as Map<String, dynamic>? ?? const {};
        throw StateError(validation['text'] as String? ?? '打包失败');
      }
      final preparedValidation =
          prepared['validation'] as Map<String, dynamic>? ?? const {};
      final preparedWarningText = preparedValidation['hasWarnings'] == true
          ? (preparedValidation['text'] as String? ?? '')
          : '';
      final preparedLauncherCount = prepared['launcherFileCount'] as int? ?? 0;
      final preparedGameCount = prepared['gameFileCount'] as int? ?? 0;
      final preparedLauncherDeletedCount =
          prepared['launcherDeletedCount'] as int? ?? 0;
      final preparedLauncherTriggersSelfUpdate =
          prepared['launcherTriggersSelfUpdate'] as bool? ?? false;
      if ((preparedLauncherCount + preparedGameCount) <= 0) {
        throw StateError('本地打包完成后没有可导出文件，请确认已选择启动器程序文件或游戏文件。');
      }

      if (mounted) {
        setState(() {
          _publishStageText = '更新包已生成，正在写入目标位置…';
          _publishProgress = 1.0;
          _publishProgressLabel = '100.0%';
        });
      }
      setState(() {
        _lastResult = BundleExportResult.fromJson(prepared);
        _publishStageText = '更新包已保存完成';
        _publishProgress = 1.0;
        _publishProgressLabel = '100.0%';
      });
      final launcherBehaviorMessage = preparedLauncherTriggersSelfUpdate
          ? '本次发布会触发启动器自升级。'
          : '本次发布不会触发启动器自升级（launcher 仅为空包或无变更）。';
      final launcherSummaryMessage = preparedLauncherDeletedCount > 0
          ? '$launcherBehaviorMessage\n启动器删除项 ${preparedLauncherDeletedCount} 个。'
          : launcherBehaviorMessage;
      if (preparedWarningText.trim().isNotEmpty) {
        _setActionMessage(
          '已将更新包默认保存到 $outputPath。\n\n如需自定义位置，可点击“另存到...”。\n\n$launcherSummaryMessage\n\n$preparedWarningText',
          tone: ActionMessageTone.warning,
        );
      } else {
        _setActionMessage(
          '已将更新包默认保存到 $outputPath。\n\n如需自定义位置，可点击“另存到...”。\n\n$launcherSummaryMessage',
          tone: ActionMessageTone.success,
        );
      }
      _showSnackBar('已将更新包默认保存到 $outputPath。');
      unawaited(_refreshLocalBundles());
    } catch (error) {
      _setActionMessage('保存更新包失败: $error', tone: ActionMessageTone.error);
      _showSnackBar('保存更新包失败: $error');
    } finally {
      await _safeDelete(selectionFile);
      await _safeDelete(notesFile);
      if (mounted) {
        setState(() {
          _publishing = false;
          _publishStageText = '';
          _publishProgress = null;
          _publishProgressLabel = '';
        });
      }
    }
  }

  Future<void> _safeDelete(File file) async {
    if (file.existsSync()) {
      await file.delete();
    }
  }

  void _showSnackBar(String message) {
    final messenger = _scaffoldMessengerKey.currentState;
    if (!mounted || messenger == null) {
      return;
    }
    messenger
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  void _onStateChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  bool _matchesSearch(CatalogTreeNode node, String keyword) {
    if (keyword.isEmpty) {
      return true;
    }
    if (node.relativePath.toLowerCase().contains(keyword) ||
        node.displayName.toLowerCase().contains(keyword)) {
      return true;
    }
    return node.children.any((child) => _matchesSearch(child, keyword));
  }

  bool _isProtectedLauncherRelativePath(String relativePath) {
    final normalized = relativePath.replaceAll('\\', '/');
    for (final prefix in _launcherProtectedPrefixes) {
      if (normalized == prefix || normalized.startsWith('$prefix/')) {
        return true;
      }
    }
    return false;
  }

  List<VisibleTreeNode> get _visibleTreeNodes {
    final keyword = _searchController.text.trim().toLowerCase();
    final visible = <VisibleTreeNode>[];

    void visit(CatalogTreeNode node, int level) {
      if (!_matchesSearch(node, keyword)) {
        return;
      }
      visible.add(VisibleTreeNode(node: node, level: level));
      final showChildren = keyword.isNotEmpty || node.isExpanded;
      if (!showChildren) {
        return;
      }
      for (final child in node.children) {
        visit(child, level + 1);
      }
    }

    for (final root in _treeRoots) {
      visit(root, 0);
    }
    return visible;
  }

  GlassPalette get _palette =>
      _themeMode == PublishThemeMode.dark ? _darkPalette : _lightPalette;

  ThemeData _buildTheme(Brightness brightness) {
    final palette = brightness == Brightness.dark
        ? _darkPalette
        : _lightPalette;
    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: ColorScheme.fromSeed(
        seedColor: palette.accent,
        brightness: brightness,
      ),
      fontFamily: 'Microsoft YaHei UI',
    );
    return base.copyWith(
      scaffoldBackgroundColor: Colors.transparent,
      textTheme: base.textTheme.apply(
        bodyColor: palette.primaryText,
        displayColor: palette.primaryText,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: palette.inputFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: palette.panelBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: palette.panelBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: palette.accent, width: 1.2),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'EE2X 更新包打包器 · $_buildId',
      scaffoldMessengerKey: _scaffoldMessengerKey,
      themeMode: _themeMode == PublishThemeMode.dark
          ? ThemeMode.dark
          : ThemeMode.light,
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
      home: Builder(
        builder: (context) {
          return Scaffold(
            body: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [_palette.backgroundTop, _palette.backgroundBottom],
                ),
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: -120,
                    left: -80,
                    child: _glowOrb(_palette.glowA, 320),
                  ),
                  Positioned(
                    right: -100,
                    bottom: -120,
                    child: _glowOrb(_palette.glowB, 340),
                  ),
                  SafeArea(child: _buildBody(context)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_loadingWorkspace) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: _palette.accent),
            const SizedBox(height: 16),
            Text(
              '正在定位工程与初始化打包环境...',
              style: TextStyle(color: _palette.primaryText),
            ),
          ],
        ),
      );
    }
    if (_errorMessage != null) {
      return Center(
        child: GlassPanel(
          palette: _palette,
          padding: const EdgeInsets.all(28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 620),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline, size: 56, color: _palette.accent),
                const SizedBox(height: 16),
                Text(
                  '初始化失败',
                  style: TextStyle(
                    color: _palette.primaryText,
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _errorMessage ?? '初始化失败',
                  style: TextStyle(color: _palette.secondaryText, height: 1.5),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      child: Column(
        children: [
          _buildHeader(),
          const SizedBox(height: 18),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 1180;
                if (wide) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(flex: 7, child: _buildCatalogPanel()),
                      const SizedBox(width: 18),
                      Expanded(flex: 4, child: _buildSummaryPanel()),
                    ],
                  );
                }
                return Column(
                  children: [
                    Expanded(child: _buildCatalogPanel()),
                    const SizedBox(height: 18),
                    SizedBox(height: 380, child: _buildSummaryPanel()),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return GlassPanel(
      palette: _palette,
      padding: const EdgeInsets.all(22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'EE2X 更新包打包器',
                      style: TextStyle(
                        color: _palette.primaryText,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '只保留一条动作链：选择根目录、勾选文件或文件夹、默认保存单个更新包 ZIP，需要时再另存到自定义位置。',
                      style: TextStyle(
                        color: _palette.secondaryText,
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: _palette.warningSoft,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: _palette.panelBorder),
                      ),
                      child: Text(
                        _buildMarker,
                        style: TextStyle(
                          color: _palette.primaryText,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              FilledButton.tonalIcon(
                onPressed: _toggleTheme,
                icon: Icon(
                  _themeMode == PublishThemeMode.dark
                      ? Icons.light_mode
                      : Icons.dark_mode,
                ),
                label: Text(
                  _themeMode == PublishThemeMode.dark ? '切换浅色' : '切换暗黑',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _glassTextField(
                  controller: _rootController,
                  hintText: 'Empire Earth II 根目录',
                  readOnly: true,
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: _pickRootDirectory,
                icon: const Icon(Icons.folder_open),
                label: const Text('选择根目录'),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: _scanningCatalog ? null : _scanCatalog,
                icon: const Icon(Icons.sync),
                label: Text(_scanningCatalog ? '扫描中...' : '重新扫描'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _statusChip('工作模式', '纯本地打包'),
              _statusChip('输出格式', 'ZIP Bundle'),
              _statusChip('已勾选', '${_selectionSummary.selectedPaths.length} 项'),
              _statusChip(
                'Launcher',
                '${_selectionSummary.launcherEntries.where((entry) => !_isProtectedLauncherRelativePath(entry.relativePath)).length} 项',
              ),
              _statusChip('Game', '${_selectionSummary.gameEntries.length} 项'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCatalogPanel() {
    final visibleNodes = _visibleTreeNodes;
    final favoriteEntries = _favoriteEntries;
    final availableFavoriteCount = favoriteEntries
        .where((item) => item.exists)
        .length;
    return GlassPanel(
      palette: _palette,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '文件勾选区',
                  style: TextStyle(
                    color: _palette.primaryText,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              _buildScopeLegend(PackageScope.launcher, 'Launcher'),
              const SizedBox(width: 8),
              _buildScopeLegend(PackageScope.game, 'Game'),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _buildCatalogTabButton(
                CatalogPanelTab.browse,
                '文件浏览',
                description: '树形目录',
              ),
              _buildCatalogTabButton(
                CatalogPanelTab.favorites,
                '收藏',
                description: '${_favoritePaths.length} 项',
              ),
              _buildCatalogTabButton(
                CatalogPanelTab.packageManager,
                '更新包管理',
                description: _localBundleEntries.isEmpty
                    ? '本地 ZIP'
                    : '${_localBundleEntries.length} 个',
              ),
              _buildCatalogTabButton(
                CatalogPanelTab.serverVersions,
                '服务器版本',
                description: _serverChannel.isEmpty ? '当前频道' : _serverChannel,
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (_catalogTab == CatalogPanelTab.browse) ...[
            Row(
              children: [
                Expanded(
                  child: _glassTextField(
                    controller: _searchController,
                    hintText: '搜索相对路径，例如 Core/resources/app 或 EE2X_db',
                    prefixIcon: const Icon(Icons.search),
                  ),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: _expandAll,
                  icon: const Icon(Icons.unfold_more),
                  label: const Text('全部展开'),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: _collapseAll,
                  icon: const Icon(Icons.unfold_less),
                  label: const Text('全部折叠'),
                ),
                const SizedBox(width: 12),
                TextButton.icon(
                  onPressed: _clearSelection,
                  icon: const Icon(Icons.check_box_outline_blank),
                  label: const Text('清空勾选'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.tonalIcon(
                onPressed: _applyLauncherSafePreset,
                icon: const Icon(Icons.security_update_good_rounded),
                label: const Text('导出启动器程序更新（自动排除本地状态）'),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '共 ${_catalog.length} 项，当前可见 ${visibleNodes.length} 项。点击星标可加入收藏。',
              style: TextStyle(color: _palette.secondaryText, fontSize: 12.5),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                controller: _catalogScrollController,
                itemCount: visibleNodes.length,
                itemBuilder: (context, index) =>
                    _buildTreeTile(visibleNodes[index]),
              ),
            ),
          ] else if (_catalogTab == CatalogPanelTab.favorites) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _palette.warningSoft,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _palette.panelBorder),
              ),
              child: Text(
                '收藏页中的项目默认不勾选。手动勾选后，会和文件浏览页共用同一套打包选择。',
                style: TextStyle(
                  color: _palette.primaryText,
                  height: 1.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '共 ${favoriteEntries.length} 项，可用 $availableFavoriteCount 项，未找到 ${favoriteEntries.length - availableFavoriteCount} 项',
              style: TextStyle(color: _palette.secondaryText, fontSize: 12.5),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: favoriteEntries.isEmpty
                  ? Center(
                      child: Text(
                        '暂无收藏。先在“文件浏览”标签里点星标加入高频修改项。',
                        style: TextStyle(
                          color: _palette.secondaryText,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    )
                  : ListView.builder(
                      itemCount: favoriteEntries.length,
                      itemBuilder: (context, index) =>
                          _buildFavoriteTile(favoriteEntries[index]),
                    ),
            ),
          ] else if (_catalogTab == CatalogPanelTab.packageManager) ...[
            _buildLocalPackageManagerPanel(),
          ] else if (_catalogTab == CatalogPanelTab.serverVersions) ...[
            _buildServerVersionsPanel(),
          ],
        ],
      ),
    );
  }

  Widget _buildCatalogTabButton(
    CatalogPanelTab tab,
    String label, {
    required String description,
  }) {
    final selected = _catalogTab == tab;
    return InkWell(
      onTap: () => _switchCatalogTab(tab),
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? _palette.accentSoft : _palette.inputFill,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? _palette.accent : _palette.panelBorder,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                color: _palette.primaryText,
                fontWeight: FontWeight.w800,
                fontSize: 13.4,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              description,
              style: TextStyle(
                color: _palette.secondaryText,
                fontSize: 11.6,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocalPackageManagerPanel() {
    final bundleDir = _localBundleDirectoryOrNull;
    final entries = _localBundleEntries;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '管理默认输出目录中的历史更新包，可在打包前核对本地版本并清理旧包。',
                style: TextStyle(
                  color: _palette.secondaryText,
                  fontSize: 12.5,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: _openLocalBundleDirectory,
              icon: const Icon(Icons.folder_special_rounded),
              label: const Text('打开更新包目录'),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: _loadingLocalBundles ? null : _refreshLocalBundles,
              icon: const Icon(Icons.sync_rounded),
              label: Text(_loadingLocalBundles ? '刷新中...' : '刷新'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _palette.inputFill,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _palette.panelBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '默认目录',
                style: TextStyle(
                  color: _palette.secondaryText,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              SelectableText(
                bundleDir?.path ?? '打包环境尚未初始化',
                style: TextStyle(
                  color: _palette.primaryText,
                  fontSize: 12.8,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
        if (_localBundleError != null) ...[
          const SizedBox(height: 12),
          _buildMessageCard(
            _localBundleError ?? '',
            tone: ActionMessageTone.error,
          ),
        ],
        const SizedBox(height: 12),
        Text(
          '共 ${entries.length} 个本地 ZIP，按文件修改时间倒序显示。',
          style: TextStyle(color: _palette.secondaryText, fontSize: 12.5),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _loadingLocalBundles
              ? Center(
                  child: CircularProgressIndicator(color: _palette.accent),
                )
              : entries.isEmpty
              ? Center(
                  child: Text(
                    '暂无历史更新包。生成并保存到默认目录后，这里会自动显示新 ZIP。',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: _palette.secondaryText,
                      height: 1.5,
                    ),
                  ),
                )
              : ListView.separated(
                  itemCount: entries.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) =>
                      _buildLocalBundleCard(entries[index]),
                ),
        ),
      ],
    );
  }

  Widget _buildLocalBundleCard(LocalBundleEntry entry) {
    final versionLabel = entry.isStructuredName
        ? entry.versionLabel
        : '未知版本';
    final timeLabel = entry.bundleTimestamp == null
        ? '文件时间 ${_formatDateTime(entry.modifiedAt)}'
        : '命名时间 ${_formatDateTime(entry.bundleTimestamp!)} · 文件时间 ${_formatDateTime(entry.modifiedAt)}';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _palette.inputFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _palette.panelBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                versionLabel,
                style: TextStyle(
                  color: _palette.primaryText,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              _inlineBadge(
                entry.isStructuredName ? '规范命名' : '旧命名',
                entry.isStructuredName
                    ? _palette.successSoft
                    : _palette.warningSoft,
                entry.isStructuredName
                    ? const Color(0xFF3AB57C)
                    : const Color(0xFFAF7A08),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            entry.fileName,
            style: TextStyle(
              color: _palette.primaryText,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            timeLabel,
            style: TextStyle(color: _palette.secondaryText, fontSize: 12.5),
          ),
          const SizedBox(height: 4),
          Text(
            '文件大小: ${_formatByteSize(entry.sizeBytes)}',
            style: TextStyle(color: _palette.secondaryText, fontSize: 12.5),
          ),
          const SizedBox(height: 6),
          SelectableText(
            entry.absolutePath,
            style: TextStyle(
              color: _palette.secondaryText,
              fontSize: 12.3,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              OutlinedButton.icon(
                onPressed: () => _revealLocalBundle(entry),
                icon: const Icon(Icons.folder_open_rounded),
                label: const Text('定位文件'),
              ),
              OutlinedButton.icon(
                onPressed: () => _saveLocalBundleAs(entry),
                icon: const Icon(Icons.save_as_rounded),
                label: const Text('另存到...'),
              ),
              FilledButton.tonalIcon(
                onPressed: () => _deleteLocalBundle(entry),
                icon: const Icon(Icons.delete_outline_rounded),
                label: const Text('删除'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildServerVersionsPanel() {
    final normalizedInput = _normalizedInputVersionForServerCheck;
    final inputRaw = _versionController.text.trim();
    final conflicts = _conflictingServerEntries;
    String? compareMessage;
    ActionMessageTone? compareTone;
    if (inputRaw.isEmpty) {
      compareMessage = '请先填写版本号，再用服务器版本页核对是否存在重号。';
      compareTone = ActionMessageTone.warning;
    } else if (normalizedInput == null) {
      compareMessage = '请先填写合法版本号再核对，格式需为 x.y.z。';
      compareTone = ActionMessageTone.error;
    } else if (_serverHistoryEntries.isNotEmpty && conflicts.isNotEmpty) {
      compareMessage =
          '当前输入版本 $normalizedInput 已存在于服务器历史，推送可能冲突。';
      compareTone = ActionMessageTone.warning;
    } else if (_serverHistoryEntries.isNotEmpty) {
      compareMessage =
          '当前输入版本 $normalizedInput 未在服务器历史中发现重复。';
      compareTone = ActionMessageTone.success;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '进入本页会自动拉取当前频道的服务器版本清单，方便打包前核对版本号是否冲突。',
                style: TextStyle(
                  color: _palette.secondaryText,
                  fontSize: 12.5,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: _loadingServerVersions ? null : _loadServerVersions,
              icon: const Icon(Icons.cloud_sync_rounded),
              label: Text(_loadingServerVersions ? '拉取中...' : '刷新'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _statusChip(
              '频道',
              _serverChannel.isEmpty
                  ? (_remoteInfo?.channel.isNotEmpty == true
                        ? _remoteInfo!.channel
                        : '未读取')
                  : _serverChannel,
            ),
            _statusChip(
              '当前 latest',
              _serverCurrentVersion.isNotEmpty ? _serverCurrentVersion : '未读取',
            ),
            _statusChip('历史数', '${_serverHistoryEntries.length} 条'),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _palette.inputFill,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _palette.panelBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'latest URL',
                style: TextStyle(
                  color: _palette.secondaryText,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              SelectableText(
                _serverLatestUrl.isNotEmpty
                    ? _serverLatestUrl
                    : (_remoteInfo?.latestUrl ?? '尚未读取'),
                style: TextStyle(
                  color: _palette.primaryText,
                  fontSize: 12.8,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
        if (compareMessage != null && compareTone != null) ...[
          const SizedBox(height: 12),
          _buildMessageCard(compareMessage, tone: compareTone),
        ],
        if (_serverVersionsError != null) ...[
          const SizedBox(height: 12),
          _buildMessageCard(
            _serverVersionsError ?? '',
            tone: ActionMessageTone.error,
          ),
        ],
        const SizedBox(height: 12),
        Expanded(
          child: _loadingServerVersions
              ? Center(
                  child: CircularProgressIndicator(color: _palette.accent),
                )
              : _serverHistoryEntries.isEmpty
              ? Center(
                  child: Text(
                    '服务器上暂无历史版本记录。',
                    style: TextStyle(
                      color: _palette.secondaryText,
                      height: 1.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                )
              : ListView.separated(
                  itemCount: _serverHistoryEntries.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) => _buildServerVersionCard(
                    _serverHistoryEntries[index],
                    highlightConflict: conflicts.any(
                      (conflict) =>
                          conflict.releaseId ==
                          _serverHistoryEntries[index].releaseId,
                    ),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildServerVersionCard(
    ReleaseHistoryEntry entry, {
    required bool highlightConflict,
  }) {
    final isCurrent = entry.releaseId == _serverCurrentReleaseId;
    final versionLabel = entry.version.isEmpty ? entry.releaseId : entry.version;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _palette.inputFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: highlightConflict
              ? const Color(0xFFD65A54).withValues(alpha: 0.55)
              : isCurrent
              ? _palette.accent.withValues(alpha: 0.5)
              : _palette.panelBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                versionLabel,
                style: TextStyle(
                  color: _palette.primaryText,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (isCurrent)
                _inlineBadge('当前版本', _palette.accentSoft, _palette.accent),
              if (highlightConflict)
                _inlineBadge(
                  '版本冲突',
                  _palette.dangerSoft,
                  const Color(0xFFD65A54),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Release ID: ${entry.releaseId}',
            style: TextStyle(color: _palette.secondaryText, fontSize: 12.5),
          ),
          const SizedBox(height: 4),
          Text(
            entry.generatedAt.isEmpty ? '生成时间未知' : entry.generatedAt,
            style: TextStyle(color: _palette.secondaryText, fontSize: 12.5),
          ),
          if (entry.notes.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              entry.notes.trim(),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: _palette.secondaryText,
                height: 1.45,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFavoriteTile(FavoriteEntryView favorite) {
    final scopeColor = favorite.scope == PackageScope.launcher
        ? _palette.accent
        : const Color(0xFF3AB57C);
    final canSelect =
        favorite.exists && _pathCanBeSelected(favorite.relativePath);
    final checkboxValue = canSelect
        ? _selectionValueForPath(favorite.relativePath)
        : false;
    final nextValue = canSelect
        ? _nextSelectionValueForPath(favorite.relativePath)
        : false;
    final statusColor = favorite.exists
        ? const Color(0xFF3AB57C)
        : const Color(0xFFAF7A08);
    final statusFill = favorite.exists
        ? _palette.successSoft
        : _palette.warningSoft;
    final icon = switch (favorite.kind) {
      CatalogEntryKind.directory => Icons.folder_copy_rounded,
      CatalogEntryKind.file => Icons.description_outlined,
      null => Icons.help_outline_rounded,
    };
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _palette.inputFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: favorite.exists
              ? _palette.panelBorder
              : statusColor.withValues(alpha: 0.45),
        ),
      ),
      child: Row(
        children: [
          Checkbox(
            tristate: true,
            value: checkboxValue,
            onChanged: canSelect
                ? (_) => _toggleSelection(favorite.relativePath, nextValue)
                : null,
          ),
          Icon(
            icon,
            color: favorite.exists ? scopeColor : _palette.secondaryText,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  favorite.displayName.isEmpty
                      ? favorite.relativePath
                      : favorite.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: _palette.primaryText,
                    fontWeight: FontWeight.w700,
                    fontSize: 13.8,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  favorite.relativePath,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: _palette.secondaryText,
                    fontSize: 12.2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _inlineBadge(
            favorite.scope == PackageScope.launcher ? 'Launcher' : 'Game',
            scopeColor.withValues(alpha: 0.12),
            scopeColor,
          ),
          const SizedBox(width: 8),
          _inlineBadge(favorite.exists ? '正常' : '未找到', statusFill, statusColor),
          const SizedBox(width: 4),
          IconButton(
            onPressed: favorite.exists
                ? () => _revealPathInBrowseTab(favorite.relativePath)
                : null,
            icon: const Icon(Icons.my_location_rounded),
            tooltip: '定位到文件浏览',
          ),
          IconButton(
            onPressed: () => _removeFavorite(favorite.relativePath),
            icon: const Icon(Icons.star_rounded),
            color: const Color(0xFFFFC857),
            tooltip: '取消收藏',
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryPanel() {
    final summary = _selectionSummary;
    final launcherFileCount = summary.launcherEntries
        .where((entry) => !_isProtectedLauncherRelativePath(entry.relativePath))
        .length;
    final gameFileCount = summary.gameEntries.length;
    return GlassPanel(
      palette: _palette,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '打包信息',
            style: TextStyle(
              color: _palette.primaryText,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _summaryCard(
                  '启动器文件数',
                  launcherFileCount.toString(),
                  _palette.accentSoft,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _summaryCard(
                  '游戏文件数',
                  gameFileCount.toString(),
                  _palette.successSoft,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _summaryCard(
                  '服务器版本',
                  _remoteInfo?.latestVersion.trim().isNotEmpty == true
                      ? _remoteInfo!.latestVersion
                      : '未读取',
                  _palette.warningSoft,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_actionMessage != null) ...[
            _buildMessageCard(_actionMessage ?? '', tone: _actionMessageTone),
            const SizedBox(height: 16),
          ],
          _sectionTitle('版本号'),
          const SizedBox(height: 8),
          _buildVersionEditor(),
          const SizedBox(height: 16),
          _sectionTitle('更新内容'),
          const SizedBox(height: 8),
          Expanded(
            child: _glassTextField(
              controller: _notesController,
              hintText: '请输入本次版本更新内容',
              minLines: 14,
              maxLines: 20,
            ),
          ),
          const SizedBox(height: 16),
          if (_lastResult != null) ...[
            _sectionTitle('最近一次导出结果'),
            const SizedBox(height: 8),
            _buildResultCard(
              _lastResult ??
                  const BundleExportResult(
                    version: '',
                    releaseId: '',
                    bundlePath: '',
                    bundleSize: 0,
                    launcherFileCount: 0,
                    gameFileCount: 0,
                    launcherDeletedCount: 0,
                    gameDeletedCount: 0,
                    launcherTriggersSelfUpdate: false,
                  ),
            ),
            const SizedBox(height: 16),
          ],
          if (_publishing || _publishProgress != null) ...[
            _sectionTitle('打包进度'),
            const SizedBox(height: 8),
            _buildUploadProgressCard(),
            const SizedBox(height: 16),
          ],
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _publishing ? null : _saveBundleFromMainForm,
              icon: _publishing
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Theme.of(context).colorScheme.onPrimary,
                      ),
                    )
                  : const Icon(Icons.save_alt_rounded),
              label: Text(_publishing ? '正在打包...' : '生成并保存到默认目录'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTreeTile(VisibleTreeNode visibleNode) {
    final node = visibleNode.node;
    final itemKey = _catalogItemKeys.putIfAbsent(
      node.relativePath,
      () => GlobalKey(),
    );
    final scopeColor = node.scope == PackageScope.launcher
        ? _palette.accent
        : const Color(0xFF3AB57C);
    final checkboxValue = node.isIndeterminate ? null : node.isChecked;
    final nextValue = !(node.isChecked && !node.isIndeterminate);
    final leftPadding = 10.0 + (visibleNode.level * 22.0);
    return Container(
      key: itemKey,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: _pendingRevealPath == node.relativePath
            ? _palette.accentSoft
            : _palette.inputFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: (node.isChecked || node.isIndeterminate)
              ? scopeColor.withValues(alpha: 0.6)
              : (_pendingRevealPath == node.relativePath
                    ? _palette.accent
                    : _palette.panelBorder),
        ),
      ),
      child: Row(
        children: [
          SizedBox(width: leftPadding),
          SizedBox(
            width: 32,
            child: node.isDirectory
                ? IconButton(
                    onPressed: () => _toggleExpanded(node),
                    icon: Icon(
                      node.isExpanded
                          ? Icons.keyboard_arrow_down_rounded
                          : Icons.keyboard_arrow_right_rounded,
                      color: _palette.secondaryText,
                    ),
                    splashRadius: 18,
                  )
                : Icon(
                    Icons.drag_handle_rounded,
                    size: 18,
                    color: _palette.secondaryText.withValues(alpha: 0.5),
                  ),
          ),
          Checkbox(
            tristate: true,
            value: checkboxValue,
            onChanged: (_) => _toggleSelection(node.relativePath, nextValue),
          ),
          Icon(
            node.isDirectory
                ? Icons.folder_copy_rounded
                : Icons.description_outlined,
            color: scopeColor,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    node.displayName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: _palette.primaryText,
                      fontWeight: FontWeight.w700,
                      fontSize: 13.8,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    node.relativePath,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: _palette.secondaryText,
                      fontSize: 12.2,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          if (node.isDirectory)
            Text(
              '${node.children.length} 项',
              style: TextStyle(color: _palette.secondaryText, fontSize: 11.5),
            ),
          const SizedBox(width: 8),
          _inlineBadge(
            node.scope == PackageScope.launcher ? 'Launcher' : 'Game',
            scopeColor.withValues(alpha: 0.12),
            scopeColor,
          ),
          const SizedBox(width: 4),
          IconButton(
            onPressed: () => _toggleFavorite(node.relativePath),
            icon: Icon(
              _isFavorite(node.relativePath)
                  ? Icons.star_rounded
                  : Icons.star_border_rounded,
              color: _isFavorite(node.relativePath)
                  ? const Color(0xFFFFC857)
                  : _palette.secondaryText,
            ),
            tooltip: _isFavorite(node.relativePath) ? '取消收藏' : '加入收藏',
          ),
          const SizedBox(width: 6),
        ],
      ),
    );
  }

  Widget _buildResultCard(BundleExportResult result) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _palette.inputFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _palette.panelBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '版本 ${result.version}',
            style: TextStyle(
              color: _palette.primaryText,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Release ID: ${result.releaseId}',
            style: TextStyle(color: _palette.secondaryText, height: 1.45),
          ),
          const SizedBox(height: 6),
          Text(
            '默认保存: ${result.bundlePath}',
            style: TextStyle(color: _palette.secondaryText, height: 1.45),
          ),
          const SizedBox(height: 6),
          Text(
            '启动器文件 ${result.launcherFileCount} 项，游戏文件 ${result.gameFileCount} 项',
            style: TextStyle(color: _palette.secondaryText, height: 1.45),
          ),
          const SizedBox(height: 6),
          Text(
            result.launcherTriggersSelfUpdate
                ? '客户端行为: 会触发启动器自升级'
                : '客户端行为: 不会触发启动器自升级',
            style: TextStyle(color: _palette.secondaryText, height: 1.45),
          ),
          const SizedBox(height: 6),
          if ((result.launcherDeletedCount + result.gameDeletedCount) > 0) ...[
            Text(
              '删除项: 启动器 ${result.launcherDeletedCount} 项，游戏 ${result.gameDeletedCount} 项',
              style: TextStyle(color: _palette.secondaryText, height: 1.45),
            ),
            const SizedBox(height: 6),
          ],
          Text(
            '文件大小: ${_formatByteSize(result.bundleSize)}',
            style: TextStyle(color: _palette.secondaryText),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _publishing ? null : () => _saveLastBundleAs(result),
            icon: const Icon(Icons.save_as_rounded),
            label: const Text('另存到...'),
          ),
        ],
      ),
    );
  }

  Widget _buildVersionEditor() {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: _versionController,
            style: TextStyle(color: _palette.primaryText),
            decoration: InputDecoration(
              hintText: '例如 1.0.0、1.2 或 v1.2.3',
              hintStyle: TextStyle(
                color: _palette.secondaryText.withValues(alpha: 0.85),
              ),
            ),
            onTapOutside: (_) => _normalizeVersionField(allowEmptyAsBase: true),
            onSubmitted: (_) => _normalizeVersionField(allowEmptyAsBase: true),
          ),
        ),
        const SizedBox(width: 10),
        _buildVersionAdjustButton(
          icon: Icons.remove_rounded,
          tooltip: '补丁位减 1',
          onPressed: () => _adjustPatchVersion(-1),
        ),
        const SizedBox(width: 8),
        _buildVersionAdjustButton(
          icon: Icons.add_rounded,
          tooltip: '补丁位加 1',
          onPressed: () => _adjustPatchVersion(1),
        ),
      ],
    );
  }

  Widget _buildVersionAdjustButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
  }) {
    return Tooltip(
      message: tooltip,
      child: SizedBox(
        width: 46,
        height: 46,
        child: FilledButton.tonal(
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            padding: EdgeInsets.zero,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          child: Icon(icon),
        ),
      ),
    );
  }

  Widget _buildUploadProgressCard() {
    final progressValue = (_publishProgress ?? 0.0).clamp(0.0, 1.0);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _palette.inputFill,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _palette.panelBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _publishStageText.isEmpty ? '正在处理更新包…' : _publishStageText,
            style: TextStyle(
              color: _palette.primaryText,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              minHeight: 10,
              value: progressValue,
              backgroundColor: _palette.panelBorder.withValues(alpha: 0.25),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            _publishProgressLabel.isEmpty
                ? '${(progressValue * 100).toStringAsFixed(1)}%'
                : _publishProgressLabel,
            style: TextStyle(color: _palette.secondaryText, height: 1.45),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageCard(String message, {required ActionMessageTone tone}) {
    final accentColor = switch (tone) {
      ActionMessageTone.error => const Color(0xFFD65A54),
      ActionMessageTone.warning => const Color(0xFFAF7A08),
      ActionMessageTone.success => const Color(0xFF3AB57C),
    };
    final fillColor = switch (tone) {
      ActionMessageTone.error => _palette.dangerSoft,
      ActionMessageTone.warning => _palette.warningSoft,
      ActionMessageTone.success => _palette.successSoft,
    };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: fillColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: accentColor.withValues(alpha: 0.34)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(switch (tone) {
            ActionMessageTone.error => Icons.error_outline_rounded,
            ActionMessageTone.warning => Icons.warning_amber_rounded,
            ActionMessageTone.success => Icons.check_circle_outline_rounded,
          }, color: accentColor),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: _palette.primaryText,
                height: 1.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusChip(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _palette.inputFill,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _palette.panelBorder),
      ),
      child: RichText(
        text: TextSpan(
          style: TextStyle(fontFamily: 'Microsoft YaHei UI'),
          children: [
            TextSpan(
              text: '$label  ',
              style: TextStyle(
                color: _palette.secondaryText,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
            TextSpan(
              text: value,
              style: TextStyle(
                color: _palette.primaryText,
                fontSize: 12.8,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScopeLegend(PackageScope scope, String label) {
    final color = scope == PackageScope.launcher
        ? _palette.accent
        : const Color(0xFF3AB57C);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.34)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _summaryCard(String label, String value, Color fillColor) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: fillColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _palette.panelBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: _palette.secondaryText,
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              color: _palette.primaryText,
              fontSize: 26,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }

  Widget _historyActionCard({
    required String label,
    required VoidCallback? onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Ink(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: _palette.warningSoft,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _palette.panelBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '服务器历史',
                style: TextStyle(
                  color: _palette.secondaryText,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      label,
                      style: TextStyle(
                        color: _palette.primaryText,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  Icon(Icons.history_rounded, color: _palette.primaryText),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHistoryDialog({
    required String channel,
    required String latestUrl,
    required String currentReleaseId,
    required String currentVersion,
    required List<ReleaseHistoryEntry> items,
  }) {
    var dialogItems = List<ReleaseHistoryEntry>.from(items);
    var dialogCurrentReleaseId = currentReleaseId;
    var dialogCurrentVersion = currentVersion;
    var dialogMessage = '';
    String? deletingReleaseId;

    return StatefulBuilder(
      builder: (context, setDialogState) {
        Future<void> deleteEntry(ReleaseHistoryEntry entry) async {
          final releaseLabel = entry.version.isEmpty
              ? entry.releaseId
              : entry.version;
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              backgroundColor: _palette.panel.withValues(alpha: 0.98),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(22),
              ),
              title: Text(
                '删除已发布版本',
                style: TextStyle(
                  color: _palette.primaryText,
                  fontWeight: FontWeight.w700,
                ),
              ),
              content: Text(
                '确认删除 $releaseLabel 吗？\n\n这会同步删除服务器上的更新包文件和版本记录；如果它正是当前版本，系统会自动回退到上一版。',
                style: TextStyle(color: _palette.primaryText, height: 1.55),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('取消'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('确认删除'),
                ),
              ],
            ),
          );
          if (confirmed != true) {
            return;
          }

          setDialogState(() {
            deletingReleaseId = entry.releaseId;
            dialogMessage = '';
          });
          try {
            final payload = await _deleteRelease(entry.releaseId);
            if (payload['ok'] != true) {
              throw StateError(payload['error'] as String? ?? '删除版本失败');
            }
            final historyPayload = await _fetchHistoryPayload(limit: 20);
            if (historyPayload['ok'] != true) {
              throw StateError('删除成功，但刷新版本历史失败。');
            }
            await _refreshRemoteInfo();
            final refreshedItems = _parseReleaseHistoryItems(historyPayload);
            if (!context.mounted) {
              return;
            }
            setDialogState(() {
              dialogItems = refreshedItems;
              dialogCurrentReleaseId =
                  '${historyPayload['currentReleaseId'] ?? ''}';
              dialogCurrentVersion =
                  '${historyPayload['currentVersion'] ?? ''}';
              deletingReleaseId = null;
              dialogMessage = '';
            });
            _setActionMessage(
              '已删除版本 $releaseLabel。',
              tone: ActionMessageTone.success,
            );
            _showSnackBar('已删除版本 $releaseLabel。');
          } catch (error) {
            if (!context.mounted) {
              return;
            }
            setDialogState(() {
              deletingReleaseId = null;
              dialogMessage = '删除版本失败: $error';
            });
            _setActionMessage('删除版本失败: $error', tone: ActionMessageTone.error);
          }
        }

        final currentLabel = dialogCurrentVersion.isNotEmpty
            ? dialogCurrentVersion
            : dialogCurrentReleaseId;
        return AlertDialog(
          backgroundColor: _palette.panel.withValues(alpha: 0.97),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          title: Text(
            '版本历史',
            style: TextStyle(
              color: _palette.primaryText,
              fontWeight: FontWeight.w700,
            ),
          ),
          content: SizedBox(
            width: 860,
            height: 560,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '频道: $channel',
                  style: TextStyle(color: _palette.secondaryText),
                ),
                const SizedBox(height: 4),
                if (currentLabel.isNotEmpty) ...[
                  Text(
                    '当前 latest: $currentLabel',
                    style: TextStyle(
                      color: _palette.primaryText,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                SelectableText(
                  latestUrl,
                  style: TextStyle(
                    color: _palette.secondaryText,
                    fontSize: 12.5,
                  ),
                ),
                if (dialogMessage.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _buildMessageCard(
                    dialogMessage,
                    tone: ActionMessageTone.error,
                  ),
                ],
                const SizedBox(height: 14),
                Expanded(
                  child: dialogItems.isEmpty
                      ? Center(
                          child: Text(
                            '服务器上暂无历史推送记录。',
                            style: TextStyle(color: _palette.secondaryText),
                          ),
                        )
                      : ListView.separated(
                          itemCount: dialogItems.length,
                          separatorBuilder: (_, index) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final entry = dialogItems[index];
                            final isCurrent =
                                entry.releaseId == dialogCurrentReleaseId;
                            final isDeleting =
                                deletingReleaseId == entry.releaseId;
                            return Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: _palette.inputFill,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: isCurrent
                                      ? _palette.accent.withValues(alpha: 0.5)
                                      : _palette.panelBorder,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Wrap(
                                              spacing: 8,
                                              runSpacing: 8,
                                              crossAxisAlignment:
                                                  WrapCrossAlignment.center,
                                              children: [
                                                Text(
                                                  entry.version.isEmpty
                                                      ? entry.releaseId
                                                      : entry.version,
                                                  style: TextStyle(
                                                    color: _palette.primaryText,
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w700,
                                                  ),
                                                ),
                                                if (isCurrent)
                                                  _inlineBadge(
                                                    '当前版本',
                                                    _palette.accentSoft,
                                                    _palette.accent,
                                                  ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              entry.generatedAt.isEmpty
                                                  ? entry.releaseId
                                                  : entry.generatedAt,
                                              style: TextStyle(
                                                color: _palette.secondaryText,
                                                fontSize: 12.5,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      FilledButton.tonalIcon(
                                        onPressed: deletingReleaseId == null
                                            ? () => deleteEntry(entry)
                                            : null,
                                        icon: isDeleting
                                            ? SizedBox(
                                                width: 16,
                                                height: 16,
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                      color:
                                                          _palette.primaryText,
                                                    ),
                                              )
                                            : const Icon(
                                                Icons.delete_outline_rounded,
                                              ),
                                        label: Text(
                                          isDeleting ? '删除中...' : '删除版本',
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      _inlineBadge(
                                        '启动器 ${entry.launcherFileCount} 项',
                                        _palette.accentSoft,
                                        _palette.accent,
                                      ),
                                      _inlineBadge(
                                        '游戏 ${entry.gameFileCount} 项',
                                        _palette.successSoft,
                                        const Color(0xFF3AB57C),
                                      ),
                                      _inlineBadge(
                                        '删除 ${entry.launcherDeletedCount + entry.gameDeletedCount} 项',
                                        _palette.warningSoft,
                                        const Color(0xFFAF7A08),
                                      ),
                                    ],
                                  ),
                                  if (entry.notes.trim().isNotEmpty) ...[
                                    const SizedBox(height: 12),
                                    SelectableText(
                                      entry.notes,
                                      style: TextStyle(
                                        color: _palette.primaryText,
                                        height: 1.55,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: deletingReleaseId == null
                  ? () => Navigator.of(context).pop()
                  : null,
              child: const Text('关闭'),
            ),
          ],
        );
      },
    );
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
        color: _palette.primaryText,
        fontSize: 15.5,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _inlineBadge(String text, Color fill, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: fill,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _glassTextField({
    required TextEditingController controller,
    required String hintText,
    Widget? prefixIcon,
    bool readOnly = false,
    int minLines = 1,
    int maxLines = 1,
  }) {
    return TextField(
      controller: controller,
      readOnly: readOnly,
      minLines: minLines,
      maxLines: maxLines,
      style: TextStyle(color: _palette.primaryText),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: TextStyle(
          color: _palette.secondaryText.withValues(alpha: 0.85),
        ),
        prefixIcon: prefixIcon,
      ),
    );
  }

  Widget _glowOrb(Color color, double size) {
    return IgnorePointer(
      child: ImageFiltered(
        imageFilter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: 0.26),
          ),
        ),
      ),
    );
  }
}

class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.palette,
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final GlassPalette palette;
  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: palette.panel,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: palette.panelBorder),
            boxShadow: [
              BoxShadow(
                color: palette.panelShadow,
                blurRadius: 24,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}
