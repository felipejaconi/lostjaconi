import sys

with open('src/pages/admin/AdminFinancial.tsx', 'r') as f:
    content = f.read()

target1 = '''                                       } catch(e) {}
                                       
                                       return null;
                                    })()}'''
replacement1 = '''                                       } catch(e) {}
                                       if (f.tipo?.startsWith('despesa')) {
                                          return <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Armazém Central</p>;
                                       }
                                       return null;
                                    })()}'''

target2 = '''                    } catch(e) {}
                    
                    return null;
                 })()}
               </div>'''
replacement2 = '''                    } catch(e) {}
                    if (selectedFatura.tipo?.startsWith('despesa')) {
                       return <p className="text-[11px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Destino: Armazém Central</p>;
                    }
                    return null;
                 })()}
               </div>'''

if target1 in content or target2 in content:
    content = content.replace(target1, replacement1)
    content = content.replace(target2, replacement2)
    with open('src/pages/admin/AdminFinancial.tsx', 'w') as f:
        f.write(content)
    print("Added back successfully")
else:
    print("Targets not found")
