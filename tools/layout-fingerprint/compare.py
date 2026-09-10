import json, sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
diff=0
for tela in a:
    A,B=a[tela],b.get(tela,{})
    ctr=lambda L:[[round(x[0]+x[2]/2,1), round(x[1]+x[3]/2,1)] for x in L]
    sa=ctr(A.get('seats',[])); sb=ctr(B.get('seats',[]))
    if sa!=sb:
        print(f"  [{tela}] POSIÇÃO DOS ASSENTOS mudou: {sa[:3]} -> {sb[:3]}"); diff+=1
    ia,ib=A['items'],B.get('items',{})
    for sel in ia:
        if sel not in ib: print(f"  [{tela}] {sel}: SUMIU"); diff+=1; continue
        if ia[sel]!=ib[sel]:
            for i,(x,y) in enumerate(zip(ia[sel],ib[sel])):
                if x!=y:
                    campos=["x","y","w","h","font","cor","fundo","raio","transform","z","opac"]
                    # a COR de uma carta é o naipe sorteado, não layout: ignora.
                    pula = {5} if ".card" in sel else set()
                    mud=[f"{campos[j]}: {x[j]} -> {y[j]}" for j in range(len(x)) if x[j]!=y[j] and j not in pula]
                    if not mud: continue
                    print(f"  [{tela}] {sel}[{i}]: " + "; ".join(mud[:4])); diff+=1
    for sel in ib:
        if sel not in ia: print(f"  [{tela}] {sel}: APARECEU"); diff+=1
print("TOTAL DE DIFERENÇAS:", diff)
