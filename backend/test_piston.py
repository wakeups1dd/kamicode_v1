import asyncio
from piston_client import execute_code, run_test_case_piston

async def main():
    print("Testing execute_code...")
    res = await execute_code(
        source_code="print('Hello from Piston!')",
        language="python"
    )
    print("execute_code result:")
    print(res)
    
    print("\nTesting run_test_case_piston (Success)...")
    res_test = await run_test_case_piston(
        source_code="import sys\nfor line in sys.stdin:\n    print(line.strip()[::-1])",
        test_input="hello\nworld",
        expected_output="olleh\ndlrow",
        language="python"
    )
    print("run_test_case_piston result:")
    print(res_test)

    print("\nTesting run_test_case_piston (Wrong Answer)...")
    res_test_fail = await run_test_case_piston(
        source_code="print('wrong')",
        test_input="hello",
        expected_output="olleh",
        language="python"
    )
    print("run_test_case_piston result:")
    print(res_test_fail)

if __name__ == "__main__":
    asyncio.run(main())
