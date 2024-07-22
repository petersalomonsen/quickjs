import { bytesToBase64, base64ToBytes } from './base64.js';
import { createQuickJS } from './quickjs.js';

describe('compiler', function() {
    this.timeout(20000);
    it('should compile and evaluate js source', async () => {
        const quickjs = await createQuickJS();
        expect(quickjs.evalSource(`(function () {return 11+34+55+"test".length})()`)).to.equal(11 + 34 + 55 + "test".length);
    });
    it('should evaluate quickjs bytecode', async () => {
        const quickjs = await createQuickJS();
        console.log('eval bytecode', quickjs.evalByteCode([0x02, 0x02, 0x08, 0x74, 0x65, 0x73, 0x74, 0x1a,
            0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x5f, 0x6e, 0x65,
            0x61, 0x72, 0x2e, 0x6a, 0x73, 0x0e, 0x00, 0x06,
            0x00, 0xa0, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00,
            0x00, 0x0a, 0x01, 0xa2, 0x01, 0x00, 0x00, 0x00,
            0x04, 0xde, 0x00, 0x00, 0x00, 0xe9, 0xb9, 0x9d,
            0xcd, 0x28, 0xbe, 0x03, 0x01, 0x00]));
    });
    it('should compile and evaluate quickjs bytecode', async () => {
        const quickjs = await createQuickJS();
        let bytecode = quickjs.compileToByteCode(`(function () {return 11+34+44+"test".length})()`);
        expect(quickjs.evalByteCode(bytecode)).to.equal(11 + 34 + 44 + "test".length);
    });
    it('should handle JSON.parse', async () => {
        const quickjs = await createQuickJS();
        expect(quickjs.evalSource(`JSON.parse('1')`)).to.equal(1);
        expect(quickjs.evalByteCode(quickjs.compileToByteCode(`JSON.parse('1')`))).to.equal(1);
    });
    it('should handle JSON.parse in bytecode', async () => {
        const quickjs = await createQuickJS();
        expect(quickjs.evalByteCode(await quickjs.compileToByteCode(`JSON.parse('{"a": 222}').a+3`))).to.equal(JSON.parse('{"a": 222}').a + 3);
    });
    it('should be able to import modules', async () => {
        const quickjs = await createQuickJS();
        quickjs.evalSource(`
        export function hello() {
            return 'hello from module';
        }
        `, 'module1.js');
        quickjs.evalSource(`
        import { hello } from 'module1.js';

        print(hello());        

        `, 'main.js');
        expect(quickjs.stdoutlines).to.include('hello from module');
    });
    it('should be able to import module from bytecode', async () => {
        const quickjs1 = await createQuickJS();
        const bytecode = quickjs1.compileToByteCode(`
        export function hello() {
            return 'hello from module';
        }
        `, 'module2.js');

        const quickjs2 = await createQuickJS();
        quickjs2.evalByteCode(bytecode);
        quickjs2.evalSource(`
        import { hello } from 'module2.js';

        print(hello());        

        `, 'main.js');
        expect(quickjs2.stdoutlines).to.include('hello from module');
    });
    it('should produce base64 encoded bytecode', async () => {
        const quickjs = await createQuickJS();
        const bytecode = await quickjs.compileToByteCode(`(() => 'test'.length)()`);

        expect(await quickjs.evalByteCode(base64ToBytes(bytesToBase64(bytecode)))).to.equal('test'.length);
    });
    it('should be able to get the constructor of an async function', async () => {
        const quickjs = await createQuickJS();
        const bytecode = await quickjs.compileToByteCode(`print(Object.getPrototypeOf(async function () { }).constructor.name)`);
        await quickjs.evalByteCode(bytecode);
        expect(quickjs.stdoutlines).to.include('AsyncFunction');
    });
    it('should be to handle async contract functions (near-sdk-js) does not support this', async () => {
        const quickjs = await createQuickJS();
        const bytecode = await quickjs.compileToByteCode(`export async function test() {
            print('before await');
            await new Promise(resolve => resolve());
            print('after await');
            return 100;
        }
        test();
        `, 'test.js');
        const result = await quickjs.evalByteCode(bytecode);
        expect(quickjs.stdoutlines).to.include('before await');
        expect(quickjs.stdoutlines).to.include('after await');
    });
    it('should get values from returned object', async () => {
        const quickjs = await createQuickJS();
        const bytecode = await quickjs.compileToByteCode(`(function () { return {"hello": "world", "thenumberis": 42}; })()`);
        const result = quickjs.evalByteCode(bytecode);
        expect(quickjs.getObjectPropertyValue(result, 'hello')).to.equal('world');
        expect(quickjs.getObjectPropertyValue(result, 'thenumberis')).to.equal(42);
    });
    it('should call function from bytecode', async () => {
        const quickjs = await createQuickJS();
        const bytecode = await quickjs.compileToByteCode(`
export function get_obj() {
    return {"hello": "world", "thenumberis": 42};
}
`, 'test');
        const mod = quickjs.loadByteCode(bytecode);
        const result = quickjs.callModFunction(mod, 'get_obj');
        expect(quickjs.getObjectPropertyValue(result, 'hello')).to.equal('world');
        expect(quickjs.getObjectPropertyValue(result, 'thenumberis')).to.equal(42);
    });
});
