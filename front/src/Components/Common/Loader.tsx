import React from 'react';
import { Spinner } from 'reactstrap';

import { sileo } from 'sileo';

const Loader = (props : any) => {
    if (props.error) {
        sileo.error({ title: props.error });
    }
    return (
        <React.Fragment>
            <div className="d-flex justify-content-center mx-2 mt-2">
                <Spinner color="primary"> Loading... </Spinner>
            </div>
        </React.Fragment>
    );
};

export default Loader;
