-- Apaga TODOS os cursos e eventos cadastrados (e tudo que depende deles:
-- aulas, matrículas, progresso de aula, inscrições em evento).
-- Não apaga contas de membros nem o histórico de dúvidas/ranking.
-- Ação DEFINITIVA — não tem como desfazer depois de rodar.

delete from public.courses;   -- cascade: apaga junto lessons, enrollments, lesson_progress
delete from public.events;    -- cascade: apaga junto event_registrations
