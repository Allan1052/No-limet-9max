import json, re
data = open('/tmp/all_runs_clean.json', encoding='utf-8').read()
data = re.sub(r'\x1b\[[0-9;?]*[a-zA-Z]', '', data)
try:
    d = json.loads(data)
except Exception as e:
    i = int(str(e).split('char ')[1].split(')')[0])
    print('BAD:', repr(data[max(0,i-40):i+40]))
    raise
for r in d['workflow_runs']:
    print(r['id'], r['name'], r['status'], r['conclusion'], r['head_sha'][:8], r['created_at'], r['updated_at'])
